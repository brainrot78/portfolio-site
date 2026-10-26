// Vercel serverless function: GET /api/threats
// Aggregates public threat data into one small JSON payload for the site:
//   - latest CVEs and most-sighted vulnerabilities from CIRCL Vulnerability-Lookup
//   - latest additions to the CISA Known Exploited Vulnerabilities catalogue
//   - headlines from cybersecurity news feeds
// Each source is fetched independently; a failing source never breaks the others.
// Responses are cached at Vercel's edge for 30 minutes.

const VL = 'https://vulnerability.circl.lu';
const KEV_URL = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';
const NEWS_FEEDS = [
  { name: 'The Hacker News', url: 'https://feeds.feedburner.com/TheHackersNews' },
  { name: 'BleepingComputer', url: 'https://www.bleepingcomputer.com/feed/' },
  { name: 'SecurityWeek', url: 'https://www.securityweek.com/feed/' }
];
const UA = 'Mozilla/5.0 (compatible; portfolio-threat-feed/1.0)';
const TIMEOUT_MS = 8000;

async function get(url, type) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: type === 'json' ? 'application/json' : 'application/rss+xml, application/xml, text/xml' },
    signal: AbortSignal.timeout(TIMEOUT_MS)
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return type === 'json' ? res.json() : res.text();
}

const clip = (s, n) => {
  s = String(s || '').replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s;
};
const isoDay = (d) => d.toISOString().slice(0, 10);
const safeUrl = (u) => (/^https:\/\//i.test(u || '') ? u : null);

function severity(score) {
  if (score == null) return null;
  if (score >= 9) return 'critical';
  if (score >= 7) return 'high';
  if (score >= 4) return 'medium';
  return 'low';
}

// Vulnerability-Lookup returns records in their source format (CVE JSON 5, OSV, CSAF...).
function normaliseVuln(r) {
  if (!r || typeof r !== 'object') return null;
  let id, title, summary, published, score;

  if (r.cveMetadata) { // CVE JSON 5 (cvelistv5)
    id = r.cveMetadata.cveId;
    published = r.cveMetadata.datePublished || r.cveMetadata.dateUpdated;
    const cna = (r.containers && r.containers.cna) || {};
    title = cna.title;
    const d = (cna.descriptions || []).find((x) => (x.lang || '').startsWith('en')) || (cna.descriptions || [])[0];
    summary = d && d.value;
    const metrics = [].concat(cna.metrics || [], ...((r.containers && r.containers.adp) || []).map((a) => a.metrics || []));
    for (const m of metrics) {
      const c = m.cvssV4_0 || m.cvssV3_1 || m.cvssV3_0 || m.cvssV2_0;
      if (c && typeof c.baseScore === 'number') { score = c.baseScore; break; }
    }
  } else if (r.document && r.document.title) { // CSAF advisory
    id = (r.document.tracking && r.document.tracking.id) || ((r.vulnerabilities || [])[0] || {}).cve;
    title = r.document.title;
    published = r.document.tracking && r.document.tracking.initial_release_date;
  } else if (r.id) { // OSV / GitHub advisory
    id = r.id;
    title = r.summary;
    summary = r.details;
    published = r.published || r.modified;
  }
  if (!id) return null;
  return {
    id,
    title: clip(title || summary || '', 140),
    summary: clip(summary || '', 260),
    cvss: score == null ? null : score,
    severity: severity(score),
    published: published || null,
    url: VL + '/vuln/' + encodeURIComponent(id.toLowerCase())
  };
}

async function latestCves() {
  const data = await get(VL + '/api/vulnerability/last/cvelistv5/30', 'json');
  const list = (Array.isArray(data) ? data : data.data || []).map(normaliseVuln).filter(Boolean);
  // Skip rejected/reserved entries that carry no description
  return list.filter((v) => v.title).slice(0, 12);
}

async function mostSighted() {
  const to = new Date();
  const from = new Date(to.getTime() - 7 * 864e5);
  const url = VL + '/api/stats/vulnerability/most_sighted?limit=10&date_from=' + isoDay(from) + '&date_to=' + isoDay(to);
  const data = await get(url, 'json');
  const list = Array.isArray(data) ? data : data.data || [];
  return list
    .filter((x) => x && x.vulnerability)
    .map((x) => ({
      id: String(x.vulnerability).toUpperCase(),
      count: Number(x.count) || 0,
      url: VL + '/vuln/' + encodeURIComponent(String(x.vulnerability).toLowerCase())
    }));
}

async function kev() {
  const data = await get(KEV_URL, 'json');
  return (data.vulnerabilities || [])
    .slice()
    .sort((a, b) => (a.dateAdded < b.dateAdded ? 1 : a.dateAdded > b.dateAdded ? -1 : 0))
    .slice(0, 10)
    .map((v) => ({
      id: v.cveID,
      vendor: v.vendorProject,
      product: v.product,
      name: clip(v.vulnerabilityName, 120),
      summary: clip(v.shortDescription, 220),
      dateAdded: v.dateAdded,
      dueDate: v.dueDate,
      ransomware: String(v.knownRansomwareCampaignUse || '').toLowerCase() === 'known',
      url: VL + '/vuln/' + encodeURIComponent(String(v.cveID).toLowerCase())
    }));
}

function decode(s) {
  return String(s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .trim();
}
function tag(xml, name) {
  const m = xml.match(new RegExp('<' + name + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + name + '>', 'i'));
  return m ? decode(m[1]) : '';
}

async function newsFeed(feed) {
  const xml = await get(feed.url, 'xml');
  const items = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || [];
  return items.slice(0, 8).map((it) => {
    const date = new Date(tag(it, 'pubDate') || tag(it, 'dc:date'));
    return {
      title: clip(tag(it, 'title'), 160),
      url: safeUrl(tag(it, 'link')),
      source: feed.name,
      published: isNaN(date) ? null : date.toISOString()
    };
  }).filter((n) => n.title && n.url);
}

module.exports = async function handler(req, res) {
  const tasks = {
    latest: latestCves(),
    sighted: mostSighted(),
    kev: kev(),
    ...Object.fromEntries(NEWS_FEEDS.map((f) => ['news:' + f.name, newsFeed(f)]))
  };
  const keys = Object.keys(tasks);
  const results = await Promise.allSettled(Object.values(tasks));

  const out = { generatedAt: new Date().toISOString(), sources: {}, latest: [], sighted: [], kev: [], news: [] };
  results.forEach((r, i) => {
    const key = keys[i];
    out.sources[key.replace(/^news:/, '')] = r.status === 'fulfilled' ? { ok: true } : { ok: false, error: String(r.reason && r.reason.message || r.reason).slice(0, 120) };
    if (r.status !== 'fulfilled') return;
    if (key.startsWith('news:')) out.news.push(...r.value);
    else out[key] = r.value;
  });
  out.news.sort((a, b) => ((a.published || '') < (b.published || '') ? 1 : -1));
  out.news = out.news.slice(0, 15);

  const anyOk = Object.values(out.sources).some((s) => s.ok);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', anyOk ? 'public, s-maxage=1800, stale-while-revalidate=3600' : 'no-store');
  res.statusCode = anyOk ? 200 : 502;
  res.end(JSON.stringify(out));
};

module.exports.normaliseVuln = normaliseVuln;
