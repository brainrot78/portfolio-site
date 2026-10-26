// Interactive terminal: open with the ` key, Ctrl/Cmd+K or the >_ button in the nav.
(function () {
  var PAGES = {
    home: '/', about: '/#about', experience: '/#experience', projects: '/#projects', skills: '/#skills', contact: '/#contact',
    blog: '/blog', attack: '/attack', threats: '/threats', toolbox: '/toolbox',
    banking: '/projects/banking-security-platform', devsecops: '/projects/devsecops-pipeline',
    github: 'https://github.com/medaminehammami', linkedin: 'https://www.linkedin.com/in/medamine-hammami'
  };
  var PROJECTS = [
    ['banking-security-platform', 'Bank-like infrastructure, 7 defence layers, SOC with SOAR (92% detection)'],
    ['devsecops-pipeline', 'Jenkins shift-left pipeline: Gitleaks, SonarQube, Dependency-Check, Trivy, Nikto, DefectDojo'],
    ['attack-coverage', 'MITRE ATT&CK heatmap of what my projects detect (open attack)'],
    ['threat-feed', 'Live CVE, KEV and news feed (open threats)'],
    ['ioc-extractor', 'Paste a report, get the indicators (open toolbox)']
  ];
  var SKILLS = {
    'soc & ir': 'alert triage · threat hunting · incident investigation · IR playbooks',
    'detection': 'Wazuh · ELK · Sentinel · KQL · Sigma · YARA · Suricata · Snort',
    'soar': 'n8n · TheHive · Cortex · DFIR-IRIS · Python · FastAPI',
    'threat intel': 'MISP · OpenCTI · OSINT · VirusTotal · AbuseIPDB · OTX · KEV · EPSS',
    'ai': 'LLM/RAG · Ollama · AI agents · MCP · ML malware detection · UEBA',
    'network': 'pfSense · OPNsense · WireGuard · Nginx · BunkerWeb · Naxsi · Cloudflare',
    'devsecops': 'Jenkins · Gitleaks · SonarQube · Dependency-Check · Trivy · DefectDojo',
    'offensive': 'Metasploit · Burp Suite · Nmap · Wireshark · Caldera · GoPhish'
  };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  var el = document.createElement('div');
  el.className = 'term';
  el.id = 'term';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', 'Interactive terminal');
  el.hidden = true;
  el.innerHTML =
    '<div class="term-win">' +
      '<div class="term-bar"><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="mono">guest@hammami: ~</span><button class="term-x" aria-label="Close terminal">×</button></div>' +
      '<div class="term-out mono" id="term-out" aria-live="polite"></div>' +
      '<form class="term-line mono" id="term-form" autocomplete="off"><label for="term-in"><span class="pr">guest@hammami</span>:<span class="pa">~</span>$</label><input id="term-in" spellcheck="false" autocapitalize="off" autocomplete="off"></form>' +
    '</div>';
  document.body.appendChild(el);

  var out = el.querySelector('#term-out');
  var input = el.querySelector('#term-in');
  var history = [], hi = 0, opened = false, lastFocus = null;

  function print(html, cls) {
    var d = document.createElement('div');
    if (cls) d.className = cls;
    d.innerHTML = html;
    out.appendChild(d);
    out.scrollTop = out.scrollHeight;
  }
  function link(href, text) {
    var ext = /^https?:/.test(href);
    return '<a href="' + esc(href) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' + esc(text || href) + '</a>';
  }
  function go(href) {
    if (/^https?:/.test(href)) window.open(href, '_blank', 'noopener');
    else { close(); location.href = href; }
  }

  var COMMANDS = {
    whoami: function () {
      return '<b>Mohamed Amine Hammami</b>, Cybersecurity Engineer (ESPRIT 2026)<br>SOC engineering @ INTERPOL · Lyon, France<br><span class="muted">SOC · Threat Intelligence · SOAR · Vulnerability Management · DevSecOps</span>';
    },
    about: function () {
      return 'I build defences, not just run them: SOC automation, threat intelligence pipelines and secure-by-default infrastructure.<br>AI handles extraction and summaries; the verdicts stay deterministic and auditable.<br>Arabic (native) · French (B2) · English (B2) · Spanish (A1)';
    },
    experience: function () {
      return '<table class="term-t">' + [
        ['2026 →', 'INTERPOL', 'CTI & SOC Engineering'], ['2026', 'Wifak International Bank', 'Compliance & Vulnerability Mgmt'],
        ['2025', 'ODDO BHF', 'Cyber Threat Intelligence'], ['2024', 'Zitouna Bank', 'IT Administration'], ['2024', 'SOTETEL', 'Cybersecurity']
      ].map(function (r) { return '<tr><td class="muted">' + r[0] + '</td><td class="k">' + r[1] + '</td><td>' + r[2] + '</td></tr>'; }).join('') + '</table>';
    },
    ls: function (args) {
      if (!args[0] || /^projects\/?$/.test(args[0])) {
        return PROJECTS.map(function (p) { return '<span class="k">' + p[0] + '/</span>  <span class="muted">' + esc(p[1]) + '</span>'; }).join('<br>');
      }
      if (args[0] === '-la' || args[0] === '-a') return '<span class="muted">drwxr-xr-x</span> projects/<br><span class="muted">-rw-r--r--</span> skills<br><span class="muted">-rw-r--r--</span> certs<br><span class="muted">-r--------</span> .secrets <span class="muted">(nice try)</span>';
      return 'ls: cannot access \'' + esc(args[0]) + '\': No such file or directory';
    },
    cat: function (args) {
      var f = (args[0] || '').replace(/^~\//, '');
      if (f === 'skills') return Object.keys(SKILLS).map(function (k) { return '<span class="k">' + k.padEnd(13, ' ') + '</span>' + SKILLS[k]; }).join('<br>');
      if (f === 'certs') return COMMANDS.certs();
      if (f === '.secrets' || f === '/etc/shadow') return '<span class="warn">Permission denied.</span> Gitleaks would have caught that anyway.';
      return 'cat: ' + esc(f || '') + ': No such file. Try <i>cat skills</i>.';
    },
    certs: function () {
      return 'Microsoft SC-200 <span class="warn">(in preparation)</span><br>ICCA · eJPT (INE)<br>CEH (university exam)<br>Cisco CCNA · CyberOps<br>AWS Cloud Fundamentals · Agile Scrum Foundation';
    },
    open: function (args) {
      var k = (args[0] || '').toLowerCase();
      if (!PAGES[k]) return 'open: unknown page. Try one of: ' + Object.keys(PAGES).join(', ');
      setTimeout(function () { go(PAGES[k]); }, 250);
      return 'Opening ' + link(PAGES[k], k) + '…';
    },
    cd: function (args) { return COMMANDS.open(args); },
    contact: function () {
      return 'email     ' + link('mailto:aminehammemi00@gmail.com', 'aminehammemi00@gmail.com') + '<br>linkedin  ' + link(PAGES.linkedin, 'linkedin.com/in/medamine-hammami') + '<br>github    ' + link(PAGES.github, 'github.com/medaminehammami');
    },
    email: function () { location.href = 'mailto:aminehammemi00@gmail.com'; return 'Opening your mail client…'; },
    theme: function () { document.getElementById('theme').click(); return 'Theme set to ' + document.documentElement.dataset.theme + '.'; },
    clear: function () { out.innerHTML = ''; return null; },
    exit: function () { close(); return null; },
    date: function () { return new Date().toString(); },
    echo: function (args) { return esc(args.join(' ')); },
    pwd: function () { return '/home/guest' + esc(location.pathname); },
    defang: function (args) {
      if (!args[0]) return 'usage: defang &lt;ip|domain|url&gt;';
      return esc(args.join(' ').replace(/^http/i, 'hxxp').replace(/\./g, '[.]').replace(/@/g, '[@]'));
    },
    sudo: function () { return '<span class="warn">guest is not in the sudoers file. This incident will be reported.</span><br><span class="muted">[SOAR] case #4242 opened · severity: amused</span>'; },
    rm: function (args) { return args.join(' ').indexOf('-rf') >= 0 ? '<span class="warn">Blocked by EDR.</span> Behaviour matched T1485 (Data Destruction).' : 'rm: missing operand'; },
    nmap: function () {
      return 'Starting Nmap against hammami.portfolio<br>PORT    STATE    SERVICE<br>443/tcp <span class="k">open</span>     https (security headers: A)<br>22/tcp  filtered ssh <span class="muted">(WireGuard only)</span><br><span class="muted">Nmap done: 1 host up. Hire me to scan yours.</span>';
    },
    coverage: function () {
      return fetch('/attack/layer.json').then(function (r) { return r.json(); }).then(function (l) {
        var t = l.techniques, c = t.filter(function (x) { return x.score > 0; }).length, a = t.filter(function (x) { return x.score === 3; }).length;
        var bar = function (n, of) { var w = Math.round(n / of * 24); return '<span class="k">' + '█'.repeat(w) + '</span><span class="muted">' + '░'.repeat(24 - w) + '</span>'; };
        return 'covered    ' + bar(c, t.length) + ' ' + c + '/' + t.length + '<br>automated  ' + bar(a, t.length) + ' ' + a + '/' + t.length + '<br>' + link('/attack', '→ open the heatmap');
      });
    },
    threats: function () {
      return fetch('/api/threats').then(function (r) { return r.json(); }).then(function (d) {
        var k = (d.kev || []).slice(0, 5);
        if (!k.length) return 'Feed unavailable right now.';
        return '<span class="muted">Latest CISA KEV additions</span><br>' + k.map(function (v) {
          return '<span class="k">' + esc(v.id) + '</span>  ' + esc(v.vendor + ' ' + v.product) + (v.ransomware ? ' <span class="warn">[ransomware]</span>' : '');
        }).join('<br>') + '<br>' + link('/threats', '→ full threat feed');
      }).catch(function () { return 'Feed offline. It only runs on the deployed site.'; });
    }
  };
  COMMANDS.projects = function () { return COMMANDS.ls([]); };
  COMMANDS.skills = function () { return COMMANDS.cat(['skills']); };
  COMMANDS.cv = function () { return 'My CV is available on request: ' + link('mailto:aminehammemi00@gmail.com?subject=CV%20request', 'ask by email'); };
  COMMANDS.hire = function () { return 'Great choice. ' + COMMANDS.contact(); };

  COMMANDS.help = function () {
    return '<table class="term-t">' + [
      ['whoami', 'who I am'], ['about', 'short bio'], ['experience', 'where I have worked'],
      ['ls projects', 'list projects'], ['cat skills', 'my toolbox'], ['certs', 'certifications'],
      ['open &lt;page&gt;', 'go to a page (try <i>open attack</i>)'],
      ['threats', 'latest known exploited vulnerabilities, live'], ['coverage', 'ATT&amp;CK coverage summary'],
      ['defang &lt;ioc&gt;', 'defang an IP, domain or URL'], ['contact', 'how to reach me'],
      ['theme', 'toggle light or dark'], ['clear', 'clear the screen'], ['exit', 'close the terminal']
    ].map(function (r) { return '<tr><td class="k">' + r[0] + '</td><td>' + r[1] + '</td></tr>'; }).join('') + '</table>' +
      '<div class="muted">Tab completes · ↑/↓ history · pages: ' + Object.keys(PAGES).join(' · ') + '</div>';
  };

  COMMANDS['?'] = function () { return COMMANDS.help(); };

  function run(raw) {
    var line = raw.trim();
    print('<span class="pr">guest@hammami</span>:<span class="pa">~</span>$ ' + esc(line), 'echo');
    if (!line) return;
    history.push(line); hi = history.length;
    var parts = line.split(/\s+/);
    var cmd = parts[0].toLowerCase();
    var fn = COMMANDS[cmd];
    if (!fn) { print('command not found: ' + esc(cmd) + '. Type <span class="k">help</span>.'); return; }
    var res = fn(parts.slice(1));
    if (res && typeof res.then === 'function') {
      var p = document.createElement('div'); p.className = 'muted'; p.textContent = 'fetching…'; out.appendChild(p);
      res.then(function (html) { p.remove(); print(html); }, function () { p.remove(); print('error'); });
    } else if (res != null) print(res);
  }

  function open() {
    if (!el.hidden) return;
    lastFocus = document.activeElement;
    el.hidden = false;
    document.body.classList.add('term-open');
    if (!opened) {
      opened = true;
      print('<span class="k">hammami-os</span> v2026.10 · <span class="muted">type</span> <span class="k">help</span> <span class="muted">to get started</span>');
      run('whoami');
    }
    setTimeout(function () { input.focus(); }, 10);
  }
  function close() {
    if (el.hidden) return;
    el.hidden = true;
    document.body.classList.remove('term-open');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  el.querySelector('#term-form').addEventListener('submit', function (e) { e.preventDefault(); run(input.value); input.value = ''; });
  el.querySelector('.term-x').addEventListener('click', close);
  el.addEventListener('click', function (e) { if (e.target === el) close(); });
  el.querySelector('.term-win').addEventListener('click', function (e) { if (!e.target.closest('a') && !window.getSelection().toString()) input.focus(); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowUp') { if (hi > 0) { hi--; input.value = history[hi]; } e.preventDefault(); }
    else if (e.key === 'ArrowDown') { hi = Math.min(history.length, hi + 1); input.value = history[hi] || ''; e.preventDefault(); }
    else if (e.key === 'Tab') {
      e.preventDefault();
      var v = input.value, parts = v.split(' ');
      var pool = parts.length > 1 && /^(open|cd)$/.test(parts[0]) ? Object.keys(PAGES) : Object.keys(COMMANDS);
      var last = parts[parts.length - 1];
      var m = pool.filter(function (k) { return k.indexOf(last) === 0; });
      if (m.length === 1) { parts[parts.length - 1] = m[0]; input.value = parts.join(' ') + ' '; }
      else if (m.length > 1) print(m.join('  '), 'muted');
    } else if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); out.innerHTML = ''; }
  });

  document.addEventListener('keydown', function (e) {
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) || document.activeElement.isContentEditable;
    if (e.key === 'Escape') close();
    else if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); el.hidden ? open() : close(); }
    else if (e.key === '`' && !typing) { e.preventDefault(); open(); }
  });
  // Trap focus inside the dialog
  el.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab' || e.target === input) return;
    e.preventDefault(); input.focus();
  });

  document.querySelectorAll('#term-btn, [data-term]').forEach(function (b) { b.addEventListener('click', open); });
  window.openTerminal = open;
})();
