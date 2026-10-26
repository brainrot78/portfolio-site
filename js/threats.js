// Live threat feed: renders /api/threats on the /threats page and the home-page teaser.
(function () {
  var page = document.getElementById('threat-page');
  var mini = document.getElementById('threat-mini');
  if (!page && !mini) return;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function ago(iso) {
    if (!iso) return '';
    var t = new Date(iso).getTime();
    if (isNaN(t)) return '';
    var s = Math.max(0, (Date.now() - t) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + ' min ago';
    if (s < 86400) return Math.floor(s / 3600) + ' h ago';
    var d = Math.floor(s / 86400);
    return d === 1 ? 'yesterday' : d + ' days ago';
  }
  function day(iso) {
    var d = new Date(iso);
    return isNaN(d) ? esc(iso) : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }
  function ext(url, text, cls) {
    return '<a class="' + (cls || '') + '" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + text + '</a>';
  }
  function empty(msg) { return '<p class="feed-empty mono">' + esc(msg) + '</p>'; }

  function kevItem(v) {
    return '<li class="feed-item" data-q="' + esc((v.id + ' ' + v.vendor + ' ' + v.product + ' ' + v.name).toLowerCase()) + '">' +
      '<div class="feed-row">' + ext(v.url, esc(v.id), 'cve mono') +
      (v.ransomware ? '<span class="sev sev-critical">Ransomware</span>' : '') +
      '<span class="feed-date mono">' + day(v.dateAdded) + '</span></div>' +
      '<b>' + esc(v.vendor) + ' ' + esc(v.product) + '</b>' +
      '<small>' + esc(v.name) + '</small></li>';
  }
  function sightedList(list) {
    var max = list.reduce(function (m, x) { return Math.max(m, x.count); }, 1);
    return list.map(function (v, i) {
      return '<li class="sight" data-q="' + esc(v.id.toLowerCase()) + '">' +
        '<span class="sight-n mono">' + String(i + 1).padStart(2, '0') + '</span>' +
        ext(v.url, esc(v.id), 'cve mono') +
        '<span class="sight-bar"><span style="width:' + Math.max(4, Math.round(v.count / max * 100)) + '%"></span></span>' +
        '<span class="sight-c mono">' + esc(v.count) + '</span></li>';
    }).join('');
  }
  function cveCard(v) {
    var sev = v.severity ? '<span class="sev sev-' + esc(v.severity) + '">' + esc(v.severity) + (v.cvss != null ? ' ' + esc(v.cvss) : '') + '</span>' : '<span class="sev">Unscored</span>';
    return '<article class="card cve-card feed-item" data-q="' + esc((v.id + ' ' + v.title + ' ' + v.summary).toLowerCase()) + '">' +
      '<div class="feed-row">' + ext(v.url, esc(v.id), 'cve mono') + sev + '</div>' +
      '<h3>' + esc(v.title) + '</h3>' +
      (v.summary && v.summary !== v.title ? '<p>' + esc(v.summary) + '</p>' : '') +
      '<span class="feed-date mono">' + esc(ago(v.published)) + '</span></article>';
  }
  function newsItem(n) {
    return '<li class="feed-item news" data-q="' + esc((n.title + ' ' + n.source).toLowerCase()) + '">' +
      '<span class="feed-src mono">' + esc(n.source) + '</span>' +
      ext(n.url, esc(n.title), 'news-title') +
      '<span class="feed-date mono">' + esc(ago(n.published)) + '</span></li>';
  }

  function set(id, html) { var el = document.getElementById(id); if (el) el.innerHTML = html; }

  function renderPage(d) {
    var srcs = d.sources || {};
    var names = Object.keys(srcs);
    var ok = names.filter(function (k) { return srcs[k].ok; }).length;
    set('feed-status', '<span class="pulse" aria-hidden="true"></span>Live · updated ' + esc(ago(d.generatedAt)) + ' · ' + ok + '/' + names.length + ' sources online');
    set('feed-sources', names.map(function (k) {
      return '<span class="src ' + (srcs[k].ok ? 'up' : 'down') + '" title="' + esc(srcs[k].error || 'online') + '">' + esc(k === 'latest' ? 'Vulnerability-Lookup · latest' : k === 'sighted' ? 'Vulnerability-Lookup · sightings' : k === 'kev' ? 'CISA KEV' : k) + '</span>';
    }).join(''));
    set('kev-list', d.kev.length ? d.kev.map(kevItem).join('') : empty('KEV catalogue unavailable right now.'));
    set('sighted-list', d.sighted.length ? sightedList(d.sighted) : empty('No sightings reported in the last 7 days.'));
    set('cve-grid', d.latest.length ? d.latest.map(cveCard).join('') : empty('Vulnerability-Lookup unavailable right now.'));
    set('news-list', d.news.length ? d.news.map(newsItem).join('') : empty('News feeds unavailable right now.'));
  }

  function renderMini(d) {
    var items = (d.kev || []).slice(0, 3);
    mini.innerHTML = items.length ? items.map(function (v) {
      return '<li><span class="cve mono">' + esc(v.id) + '</span><small>' + esc(v.vendor + ' ' + v.product) + '</small></li>';
    }).join('') : '<li><small>Feed unavailable right now.</small></li>';
  }

  function load() {
    fetch('/api/threats', { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (page) renderPage(d);
        if (mini) renderMini(d);
      })
      .catch(function () {
        if (page) {
          set('feed-status', 'Feed offline. It runs as a Vercel function, so it only works on the deployed site.');
          ['kev-list', 'sighted-list', 'cve-grid', 'news-list'].forEach(function (id) { set(id, empty('Unavailable')); });
        }
        if (mini) mini.innerHTML = '<li><small>Feed unavailable right now.</small></li>';
      });
  }
  load();
  if (page) setInterval(load, 10 * 60 * 1000);

  // Filter
  var q = document.getElementById('feed-filter');
  if (q) q.addEventListener('input', function () {
    var v = q.value.trim().toLowerCase();
    page.querySelectorAll('[data-q]').forEach(function (el) {
      el.hidden = v && el.getAttribute('data-q').indexOf(v) === -1;
    });
  });
})();
