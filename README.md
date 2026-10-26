# Mohamed Amine Hammami: Portfolio

Static portfolio site in plain HTML, CSS and JS, with no build step. It deploys as-is on Vercel or GitHub Pages.

```
index.html                 Home: about, experience, projects, skills, latest posts, contact
projects/                  Case studies (banking security platform, DevSecOps pipeline)
blog/index.html            List of all posts
blog/post.html             Post page (renders Markdown)
blog/posts.json            The list of posts (title, date, summary, tags)
blog/posts/*.md            The posts themselves, written in Markdown
styles.css · script.js     Shared design and behaviour
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
3. Commit and push. Vercel redeploys automatically.

The home page shows the three most recent posts.

## Preview locally
The blog loads its posts with `fetch`, so use a local server rather than opening the file directly:
```
python3 -m http.server 8000
```
Then open http://localhost:8000.
