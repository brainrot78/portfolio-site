// Attack simulator for the banking security platform: pick an attack, watch it travel
// through the defence layers, and see which layer stops it and what the SOC does next.
(function () {
  var root = document.getElementById('sim');
  if (!root) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var LAYERS = [
    { n: 'L1', name: 'Edge', tool: 'Cloudflare' },
    { n: 'L2', name: 'Perimeter', tool: 'pfSense · WireGuard' },
    { n: 'L3', name: 'DMZ', tool: 'BunkerWeb · Naxsi · T-Pot' },
    { n: 'L4', name: 'IDS / IPS', tool: 'Suricata · Snort' },
    { n: 'L5', name: 'Segmentation', tool: 'OPNsense' },
    { n: 'L6', name: 'Endpoints', tool: 'Wazuh EDR · ML · UEBA' },
    { n: 'L7', name: 'SOC', tool: 'MISP · n8n · TheHive' }
  ];

  // status: pass | detect | block | respond
  var ATTACKS = [
    { id: 'ddos', label: 'DDoS flood', origin: 'Botnet', technique: 'T1498', steps: [
      [0, 'block', 'Volumetric flood absorbed at the edge. The origin IP stays hidden and 0 packets reach the bank.'],
      [6, 'respond', 'Attack metrics logged; source ASNs added to MISP for correlation.']
    ] },
    { id: 'scan', label: 'Recon scan', origin: 'Internet', technique: 'T1595', steps: [
      [0, 'pass', 'TCP SYN sweep passes the DNS proxy (direct-to-IP probe).'],
      [1, 'block', 'Default-deny ingress: every port except 443 is dropped.'],
      [2, 'detect', 'Probes against the exposed decoy IP land on the T-Pot honeypot, which captures the scanner fingerprint.'],
      [6, 'respond', 'Scanner IP published to MISP, then pushed back to the firewall blocklists.']
    ] },
    { id: 'sqli', label: 'SQL injection', origin: 'Internet', technique: 'T1190', steps: [
      [0, 'pass', 'HTTPS request proxied by Cloudflare.'],
      [1, 'pass', 'Port 443 allowed through to the DMZ reverse proxy.'],
      [2, 'block', 'Naxsi matches the SQL pattern (score > threshold) and BunkerWeb returns 403 before Nginx forwards the request.'],
      [6, 'respond', 'WAF event lands in Wazuh, the source IP is enriched from AlienVault OTX, and a case is opened.']
    ] },
    { id: 'ssh', label: 'SSH brute force', origin: 'Stolen VPN profile', technique: 'T1110', steps: [
      [1, 'pass', 'Attacker connects with a stolen WireGuard profile.'],
      [3, 'detect', 'Suricata flags a burst of SSH authentication attempts.'],
      [4, 'pass', 'SSH from the VPN zone to the servers is allowed for admins.'],
      [5, 'detect', 'Wazuh: 8 failed logins in 60s on the core server (rule fires).'],
      [6, 'respond', 'n8n playbook: enrich IP (MISP, AbuseIPDB), revoke the VPN peer, block, and open a case in TheHive.']
    ] },
    { id: 'malware', label: 'Malware dropper', origin: 'Phishing email', technique: 'T1204', steps: [
      [0, 'pass', 'An email link leads to a payload hosted on a clean-looking domain.'],
      [3, 'pass', 'TLS download, with no known signature yet.'],
      [5, 'block', 'ML model scores the binary as malicious and a YARA rule matches the loader; the file is quarantined.'],
      [6, 'respond', 'Malware playbook: hash enriched, host tagged, IOCs pushed to MISP, AI-written report attached to the case.']
    ] },
    { id: 'privesc', label: 'AD privilege escalation', origin: 'Compromised user', technique: 'T1098', steps: [
      [5, 'detect', 'UEBA: a user account is added to Domain Admins at 03:12, outside its normal pattern.'],
      [6, 'respond', 'Privilege escalation playbook: change reverted, account disabled, DFIR-IRIS case opened with a timeline.']
    ] },
    { id: 'c2', label: 'C2 beacon', origin: 'Infected host', technique: 'T1071', steps: [
      [5, 'pass', 'Implant starts beaconing every 60s.'],
      [4, 'block', 'Default-deny egress: the unknown destination is dropped by OPNsense.'],
      [3, 'detect', 'Suricata matches the destination against MISP-fed C2 indicators.'],
      [6, 'respond', 'Host isolated through the EDR, and a case is opened with the network evidence.']
    ] }
  ];

  var lane = document.getElementById('sim-lane');
  var log = document.getElementById('sim-log');
  var picker = document.getElementById('sim-attacks');
  var verdict = document.getElementById('sim-verdict');

  lane.innerHTML = '<div class="sim-origin mono" id="sim-origin">Internet</div>' + LAYERS.map(function (l, i) {
    return '<button class="sim-node" data-i="' + i + '" aria-label="' + l.n + ' ' + l.name + '"><span class="mono">' + l.n + '</span><b>' + l.name + '</b><small>' + l.tool + '</small></button>';
  }).join('');
  picker.innerHTML = ATTACKS.map(function (a) {
    return '<button class="chip" data-a="' + a.id + '">' + a.label + '</button>';
  }).join('');
  var nodes = lane.querySelectorAll('.sim-node');

  var timers = [];
  function clear() {
    timers.forEach(clearTimeout); timers = [];
    nodes.forEach(function (n) { n.className = 'sim-node'; });
    log.innerHTML = '';
    verdict.textContent = '';
    verdict.className = 'sim-verdict mono';
  }
  function line(html, cls) {
    var li = document.createElement('li');
    li.className = cls || '';
    li.innerHTML = html;
    log.appendChild(li);
    log.scrollTop = log.scrollHeight;
  }
  function ts() {
    var d = new Date();
    return d.toTimeString().slice(0, 8);
  }

  function run(a) {
    clear();
    picker.querySelectorAll('.chip').forEach(function (c) { c.classList.toggle('on', c.getAttribute('data-a') === a.id); });
    document.getElementById('sim-origin').textContent = a.origin;
    line('<span class="mono t">' + ts() + '</span> <b>' + a.label + '</b> launched from ' + a.origin + ' <span class="mono muted">(' + a.technique + ')</span>', 'start');
    var delay = reduce ? 0 : 750;
    var stopped = null;
    a.steps.forEach(function (s, k) {
      timers.push(setTimeout(function () {
        var node = nodes[s[0]];
        nodes.forEach(function (n) { n.classList.remove('cur'); });
        node.classList.add(s[1], 'cur');
        var L = LAYERS[s[0]];
        var tag = { pass: 'PASS', detect: 'DETECT', block: 'BLOCK', respond: 'RESPOND' }[s[1]];
        line('<span class="mono t">' + ts() + '</span> <span class="mono tag ' + s[1] + '">' + tag + '</span> <span class="mono">[' + L.n + ' ' + L.name + ']</span> ' + s[2], s[1]);
        if ((s[1] === 'block') && !stopped) stopped = L;
        if (k === a.steps.length - 1) {
          nodes.forEach(function (n) { n.classList.remove('cur'); });
          verdict.textContent = stopped ? 'Stopped at ' + stopped.n + ' ' + stopped.name + ' · SOC responded automatically' : 'Detected and contained by the SOC';
          verdict.classList.add('done');
        }
      }, delay * (k + 1)));
    });
  }

  picker.addEventListener('click', function (e) {
    var b = e.target.closest('.chip'); if (!b) return;
    var a = ATTACKS.filter(function (x) { return x.id === b.getAttribute('data-a'); })[0];
    if (a) run(a);
  });
  lane.addEventListener('click', function (e) {
    var n = e.target.closest('.sim-node'); if (!n) return;
    var target = document.getElementById('layer-' + (+n.getAttribute('data-i') + 1));
    if (target) {
      target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      target.classList.remove('flash'); void target.offsetWidth; target.classList.add('flash');
    }
  });

  // Auto-play the first scenario when the simulator scrolls into view
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { run(ATTACKS[2]); io.disconnect(); }
    }, { threshold: 0.4 });
    io.observe(root);
  }
})();
