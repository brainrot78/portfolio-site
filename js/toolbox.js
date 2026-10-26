// IOC extractor & defanger. Everything runs locally in the browser; nothing is sent anywhere.
(function () {
  var input = document.getElementById('ioc-in');
  if (!input) return;
  var out = document.getElementById('ioc-out');
  var summary = document.getElementById('ioc-summary');
  var defangOut = document.getElementById('ioc-defang');

  var FILE_EXT = /\.(exe|dll|bin|dat|txt|log|json|xml|ps1|psm1|bat|cmd|sh|py|js|php|html?|png|jpe?g|gif|pdf|docx?|xlsx?|pptx?|csv|tmp|sys|msi|lnk|vbs|hta|iso|img|jar|zip|rar|7z|gz|tar|yml|yaml|conf|ini|md)$/i;

  var TYPES = [
    { key: 'url', label: 'URLs', re: /\bhttps?:\/\/[^\s"'<>()\[\]{}]+/gi, link: function (v) { return 'https://www.virustotal.com/gui/search/' + encodeURIComponent(v); } },
    { key: 'email', label: 'Email addresses', re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,24}\b/g },
    { key: 'ipv4', label: 'IPv4 addresses', re: /\b(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\b/g, link: function (v) { return 'https://www.abuseipdb.com/check/' + v; } },
    { key: 'domain', label: 'Domains', re: /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{1,23}\b/gi, link: function (v) { return 'https://www.virustotal.com/gui/domain/' + v; } },
    { key: 'sha256', label: 'SHA-256', re: /\b[a-f0-9]{64}\b/gi, link: function (v) { return 'https://www.virustotal.com/gui/file/' + v; } },
    { key: 'sha1', label: 'SHA-1', re: /\b[a-f0-9]{40}\b/gi, link: function (v) { return 'https://www.virustotal.com/gui/file/' + v; } },
    { key: 'md5', label: 'MD5', re: /\b[a-f0-9]{32}\b/gi, link: function (v) { return 'https://www.virustotal.com/gui/file/' + v; } },
    { key: 'cve', label: 'CVEs', re: /\bCVE-\d{4}-\d{4,7}\b/gi, link: function (v) { return 'https://vulnerability.circl.lu/vuln/' + v.toLowerCase(); } },
    { key: 'attack', label: 'ATT&CK techniques', re: /\bT1\d{3}(?:\.\d{3})?\b/g, link: function (v) { return 'https://attack.mitre.org/techniques/' + v.replace('.', '/') + '/'; } }
  ];

  function refang(s) {
    return s
      .replace(/\bhxxp(s?)/gi, 'http$1').replace(/\bh\[tt\]p(s?)/gi, 'http$1').replace(/\bfxp\b/gi, 'ftp')
      .replace(/\[(\.|dot)\]|\((\.|dot)\)|\{(\.|dot)\}|\s\[dot\]\s/gi, '.')
      .replace(/\[(:|colon)\]/gi, ':').replace(/\[:\/\/\]/g, '://')
      .replace(/\[(@|at)\]|\((@|at)\)/gi, '@');
  }
  function defang(v, type) {
    if (type === 'sha256' || type === 'sha1' || type === 'md5' || type === 'cve' || type === 'attack') return v;
    return v.replace(/^http/i, 'hxxp').replace(/\./g, '[.]').replace(/@/g, '[@]');
  }
  function isPrivate(ip) {
    var p = ip.split('.').map(Number);
    return p[0] === 10 || p[0] === 127 || (p[0] === 172 && p[1] >= 16 && p[1] <= 31) || (p[0] === 192 && p[1] === 168) || (p[0] === 169 && p[1] === 254) || p[0] === 0;
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  var results = {};
  function extract() {
    var text = refang(input.value);
    var seen = {};
    results = {};
    TYPES.forEach(function (t) {
      var found = (text.match(t.re) || []).map(function (v) {
        v = v.replace(/[.,;:!?]+$/, '');
        return t.key === 'domain' || t.key === 'email' ? v.toLowerCase() : t.key === 'cve' ? v.toUpperCase() : v;
      });
      if (t.key === 'url') found = found.map(function (u) { return u.replace(/[)\]}>'"]+$/, ''); });
      if (t.key === 'domain') {
        found = found.filter(function (d) { return !FILE_EXT.test(d) && !/^\d+(\.\d+)+$/.test(d) && !/^t1\d{3}/.test(d); });
      }
      if (t.key === 'sha256' || t.key === 'sha1' || t.key === 'md5') found = found.map(function (h) { return h.toLowerCase(); });
      var uniq = found.filter(function (v) { var k = t.key + ':' + v; if (seen[k]) return false; seen[k] = 1; return true; });
      if (uniq.length) results[t.key] = uniq;
    });
    render();
  }

  function render() {
    var total = 0;
    var df = defangOut.checked;
    out.innerHTML = TYPES.filter(function (t) { return results[t.key]; }).map(function (t) {
      var list = results[t.key];
      total += list.length;
      return '<section class="ioc-group"><header><h3 class="mini mono">' + esc(t.label) + ' <span>' + list.length + '</span></h3>' +
        '<button class="chip copy-group" data-type="' + t.key + '">Copy</button></header><ul>' +
        list.map(function (v) {
          var shown = df ? defang(v, t.key) : v;
          var tag = t.key === 'ipv4' && isPrivate(v) ? '<span class="sev">private</span>' : '';
          var look = t.link && !(t.key === 'ipv4' && isPrivate(v)) ? '<a class="look mono" href="' + esc(t.link(v)) + '" target="_blank" rel="noopener noreferrer">lookup ↗</a>' : '';
          return '<li><code>' + esc(shown) + '</code>' + tag + look + '</li>';
        }).join('') + '</ul></section>';
    }).join('') || '<p class="feed-empty mono">No indicators found yet. Paste a report, an email or some logs on the left.</p>';
    summary.textContent = total ? total + ' unique indicator' + (total > 1 ? 's' : '') + ' extracted' : '';
  }

  function asText(type) {
    var df = defangOut.checked;
    var keys = type ? [type] : Object.keys(results);
    return keys.map(function (k) { return results[k].map(function (v) { return df ? defang(v, k) : v; }).join('\n'); }).join('\n');
  }
  function copy(text, btn) {
    var done = function () { var o = btn.textContent; btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = o; }, 1200); };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () {});
  }
  function download(name, type, body) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([body], { type: type }));
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  var timer;
  input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(extract, 150); });
  defangOut.addEventListener('change', render);
  out.addEventListener('click', function (e) {
    var b = e.target.closest('.copy-group');
    if (b) copy(asText(b.getAttribute('data-type')), b);
  });
  document.getElementById('ioc-copy').addEventListener('click', function (e) { copy(asText(), e.currentTarget); });
  document.getElementById('ioc-json').addEventListener('click', function () {
    download('iocs.json', 'application/json', JSON.stringify(results, null, 2));
  });
  document.getElementById('ioc-csv').addEventListener('click', function () {
    var rows = ['type,value'];
    Object.keys(results).forEach(function (k) { results[k].forEach(function (v) { rows.push(k + ',"' + v.replace(/"/g, '""') + '"'); }); });
    download('iocs.csv', 'text/csv', rows.join('\n'));
  });
  document.getElementById('ioc-clear').addEventListener('click', function () { input.value = ''; extract(); input.focus(); });
  document.getElementById('ioc-sample').addEventListener('click', function () {
    input.value = 'Threat report (sample, not real)\n\nThe phishing email from billing[@]invoice-update[.]example delivered a macro document that pulled a second stage from hxxps://cdn-update[.]example/payload/stage2.bin.\n' +
      'The implant beaconed to 203.0.113[.]47 and 198.51.100.23 over port 8443, using the C2 domain sync-telemetry[.]example. An internal pivot from 10.0.12.5 used SSH (T1021.004) after brute forcing credentials (T1110).\n\n' +
      'Hashes:\nstage2.bin  SHA256 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08\nloader.dll  MD5 5d41402abc4b2a76b9719d911017c592\n\n' +
      'The initial foothold exploited CVE-2024-3400 on an exposed firewall, and persistence was set through T1547.001.';
    extract();
  });
  extract();
})();
