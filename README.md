# Mohamed Amine Hammami: Portfolio

Static portfolio site in plain HTML, CSS and JS, with no build step. It's deployed on Vercel, and `vercel.json` gives it clean URLs.

```
index.html                 Home: about, experience, projects, skills, latest posts, contact
projects/                  Case studies (banking security platform, DevSecOps pipeline)
blog/index.html            List of all posts
blog/post.html             Post page (renders Markdown; served at /blog/<slug>)
blog/posts.json            The list of posts (title, date, summary, tags)
blog/posts/*.md            The posts themselves, written in Markdown
styles.css · script.js     Shared design and behaviour
attack/layer.json          ATT&CK coverage data (a standard ATT&CK Navigator layer)
threats/ · attack/ · toolbox/   Live threat feed, ATT&CK heatmap, IOC extractor
api/threats.js             Vercel function behind the threat feed
js/                        Page scripts: terminal, threats, attack, toolbox, simulator
og/                        Share preview images (1200×630)
.well-known/security.txt   How to report a security issue on the site
vercel.json                Clean URLs, redirects, security headers
404.html                   Not-found page
```

## Write a new blog post
1. Add a Markdown file to `blog/posts/`, e.g. `blog/posts/my-new-finding.md`.
2. Add an entry at the top of `blog/posts.json`:
   ```json
   {
     "slug": "my-new-finding",
     "title": "My new finding",
     "date": "2026-11-01",
     "summary": "One sentence shown in the list.",
     "tags": ["Threat Intel"]
   }
   ```
   `slug` must match the file name (letters, numbers and dashes only).
3. Commit and push. Vercel redeploys automatically, and the post is live at `/blog/my-new-finding`.

The home page shows the three most recent posts.

## URLs
| URL | Page |
| --- | --- |
| `/` (also `/welcome`, `/home`) | Home |
| `/projects/banking-security-platform` | Banking security case study |
| `/projects/devsecops-pipeline` | DevSecOps case study |
| `/blog` | All posts |
| `/blog/<slug>` | One post |
| `/github`, `/linkedin` | Short links to your profiles |

Link between pages with paths like `/blog`, never `something.html`.

## Preview locally
The clean URLs come from `vercel.json`, so preview with the Vercel CLI:
```
npx vercel dev
```

## Live threat feed
`/api/threats` is a Vercel serverless function. No API keys are needed. It combines:
- **CIRCL Vulnerability-Lookup:** the latest CVEs (`/api/vulnerability/last/cvelistv5/30`) and the vulnerabilities most sighted in the last 7 days (`/api/stats/vulnerability/most_sighted`)
- **CISA KEV:** the latest additions to the Known Exploited Vulnerabilities catalogue
- **News:** RSS feeds from The Hacker News, BleepingComputer and SecurityWeek

Each source is fetched separately, so one failing source doesn't break the others. Results are cached at Vercel's edge for 30 minutes. To change the news sites, edit `NEWS_FEEDS` in `api/threats.js`.

## ATT&CK coverage
Edit `attack/layer.json` to change the heatmap. Each technique has a `score`:
- 0: gap
- 1: mitigated
- 2: detected
- 3: detected with automated response

`comment` is the "how it's covered" text, and `metadata` holds the technique name and the projects. The **Open in ATT&CK Navigator** button loads this same file into MITRE's official Navigator.

## Terminal
Press `` ` `` or Ctrl/Cmd+K on any page, or click `>_`. Commands are defined in `js/terminal.js`.

## Domain
The share previews and canonical links use `https://portfolio-site-psi-lovat.vercel.app`. If you add a custom domain, search and replace that URL in all files.
