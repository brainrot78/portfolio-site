// MITRE ATT&CK coverage heatmap. Data: /attack/layer.json (a standard ATT&CK Navigator layer).
(function () {
  var full = document.getElementById('attack-matrix');
  var mini = document.getElementById('attack-mini');
  if (!full && !mini) return;

  var TACTICS = [
    ['reconnaissance', 'Reconnaissance', 'TA0043'], ['resource-development', 'Resource Development', 'TA0042'],
    ['initial-access', 'Initial Access', 'TA0001'], ['execution', 'Execution', 'TA0002'],
    ['persistence', 'Persistence', 'TA0003'], ['privilege-escalation', 'Privilege Escalation', 'TA0004'],
    ['defense-evasion', 'Defense Evasion', 'TA0005'], ['credential-access', 'Credential Access', 'TA0006'],
    ['discovery', 'Discovery', 'TA0007'], ['lateral-movement', 'Lateral Movement', 'TA0008'],
    ['collection', 'Collection', 'TA0009'], ['command-and-control', 'Command and Control', 'TA0011'],
    ['exfiltration', 'Exfiltration', 'TA0010'], ['impact', 'Impact', 'TA0040']
  ];
  var LEVELS = ['Gap', 'Mitigated', 'Detected', 'Automated response'];
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function meta(t, key) {
    return (t.metadata || []).filter(function (m) { return m.name === key; }).map(function (m) { return m.value; });
  }
  function mitreUrl(id) { return 'https://attack.mitre.org/techniques/' + id.replace('.', '/') + '/'; }

  fetch('/attack/layer.json').then(function (r) { return r.json(); }).then(function (layer) {
    var techs = layer.techniques.map(function (t) {
      return { id: t.techniqueID, tactic: t.tactic, score: t.score, how: t.comment, name: meta(t, 'name')[0] || t.techniqueID, projects: meta(t, 'project') };
    });
    if (mini) renderMini(techs);
    if (full) renderFull(techs);
  });

  function renderMini(techs) {
    mini.innerHTML = TACTICS.map(function (tc) {
      return '<span class="mini-col">' + techs.filter(function (t) { return t.tactic === tc[0]; }).map(function (t) {
        return '<i class="lv' + t.score + '"></i>';
      }).join('') + '</span>';
    }).join('');
    var covered = techs.filter(function (t) { return t.score > 0; }).length;
    var el = document.getElementById('attack-mini-stat');
    if (el) el.textContent = covered + ' of ' + techs.length + ' mapped techniques covered';
  }

  function renderFull(techs) {
    var covered = techs.filter(function (t) { return t.score > 0; });
    var auto = techs.filter(function (t) { return t.score === 3; });
    var tacticsHit = TACTICS.filter(function (tc) { return covered.some(function (t) { return t.tactic === tc[0]; }); });
    document.getElementById('attack-stats').innerHTML =
      '<div><dt>Techniques covered</dt><dd data-count="' + covered.length + '">' + covered.length + '</dd></div>' +
      '<div><dt>With automated response</dt><dd data-count="' + auto.length + '">' + auto.length + '</dd></div>' +
      '<div><dt>Tactics touched</dt><dd>' + tacticsHit.length + '/14</dd></div>' +
      '<div><dt>Known gaps to build next</dt><dd>' + (techs.length - covered.length) + '</dd></div>';

    var i = 0;
    full.innerHTML = TACTICS.map(function (tc, col) {
      var list = techs.filter(function (t) { return t.tactic === tc[0]; }).sort(function (a, b) { return b.score - a.score; });
      return '<div class="tac" role="group" aria-label="' + esc(tc[1]) + '">' +
        '<div class="tac-head"><b>' + esc(tc[1]) + '</b><span class="mono">' + tc[2] + ' · ' + list.filter(function (t) { return t.score; }).length + '/' + list.length + '</span></div>' +
        list.map(function (t) {
          var k = techs.indexOf(t);
          return '<button class="cell lv' + t.score + '" data-k="' + k + '" style="--d:' + (col * 60 + (i++ % 4) * 30) + 'ms" aria-label="' + esc(t.id + ' ' + t.name + ': ' + LEVELS[t.score]) + '">' +
            '<span class="mono">' + esc(t.id) + '</span>' + esc(t.name) + '</button>';
        }).join('') + '</div>';
    }).join('');

    // Animated reveal: a scan beam sweeps the matrix and cells light up
    var wrap = document.getElementById('attack-wrap');
    function scan() {
      if (reduce) { wrap.classList.add('lit'); return; }
      wrap.classList.remove('lit', 'scanning');
      void wrap.offsetWidth;
      wrap.classList.add('scanning');
      setTimeout(function () { wrap.classList.add('lit'); }, 30);
      setTimeout(function () { wrap.classList.remove('scanning'); }, 1700);
    }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { scan(); io.disconnect(); } }, { threshold: 0.2 });
      io.observe(wrap);
    } else scan();
    document.getElementById('attack-replay').addEventListener('click', scan);

    // Detail panel
    var panel = document.getElementById('attack-detail');
    function show(k) {
      var t = techs[k];
      full.querySelectorAll('.cell.sel').forEach(function (c) { c.classList.remove('sel'); });
      var cell = full.querySelector('[data-k="' + k + '"]');
      if (cell) cell.classList.add('sel');
      var tac = TACTICS.filter(function (tc) { return tc[0] === t.tactic; })[0];
      panel.innerHTML =
        '<p class="card-meta mono">' + esc(tac[1]) + ' · ' + esc(tac[2]) + '</p>' +
        '<h3><a href="' + mitreUrl(t.id) + '" target="_blank" rel="noopener">' + esc(t.id) + '</a> ' + esc(t.name) + '</h3>' +
        '<p class="lvl lvl' + t.score + ' mono">' + LEVELS[t.score] + '</p>' +
        '<p>' + esc(t.how || 'Not covered yet. It is on my list of things to build next.') + '</p>' +
        (t.projects.length ? '<p class="tags">' + t.projects.map(function (p) { return '<span>' + esc(p) + '</span>'; }).join('') + '</p>' : '');
    }
    full.addEventListener('click', function (e) {
      var c = e.target.closest('.cell');
      if (c) show(+c.getAttribute('data-k'));
    });
    var first = techs.filter(function (t) { return t.score === 3; })[0];
    if (first) show(techs.indexOf(first));

    // Filters: by project and by level
    var state = { project: '', levels: { 0: true, 1: true, 2: true, 3: true } };
    var projects = [];
    techs.forEach(function (t) { t.projects.forEach(function (p) { if (projects.indexOf(p) < 0) projects.push(p); }); });
    var pf = document.getElementById('attack-projects');
    pf.innerHTML = '<button class="chip on" data-p="">All projects</button>' + projects.map(function (p) {
      return '<button class="chip" data-p="' + esc(p) + '">' + esc(p) + '</button>';
    }).join('');
    function apply() {
      full.querySelectorAll('.cell').forEach(function (c) {
        var t = techs[+c.getAttribute('data-k')];
        var on = state.levels[t.score] && (!state.project || t.projects.indexOf(state.project) >= 0);
        c.classList.toggle('dim', !on);
      });
    }
    pf.addEventListener('click', function (e) {
      var b = e.target.closest('.chip'); if (!b) return;
      state.project = b.getAttribute('data-p');
      pf.querySelectorAll('.chip').forEach(function (x) { x.classList.toggle('on', x === b); });
      apply();
    });
    document.getElementById('attack-legend').addEventListener('click', function (e) {
      var b = e.target.closest('[data-lv]'); if (!b) return;
      var lv = b.getAttribute('data-lv');
      state.levels[lv] = !state.levels[lv];
      b.classList.toggle('off', !state.levels[lv]);
      b.setAttribute('aria-pressed', state.levels[lv]);
      apply();
    });

    // Open the same layer in the official MITRE ATT&CK Navigator
    var nav = document.getElementById('open-navigator');
    nav.href = 'https://mitre-attack.github.io/attack-navigator/#layerURL=' + encodeURIComponent(location.origin + '/attack/layer.json');
  }
})();
