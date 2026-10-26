(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Theme toggle
  document.getElementById('theme').addEventListener('click', function () {
    var next = root.dataset.theme === 'light' ? 'dark' : 'light';
    root.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) {}
  });

  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  // Mobile menu
  var menuBtn = document.getElementById('menu-btn');
  var menu = document.getElementById('menu');
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', function () {
      var open = menu.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', open);
    });
    menu.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') { menu.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); }
    });
  }

  // Nav border on scroll
  var nav = document.querySelector('.nav');
  var onScroll = function () { nav.classList.toggle('scrolled', window.scrollY > 8); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Typed roles (home page only)
  var typed = document.getElementById('typed');
  if (typed && !reduce) {
    var roles = ['SOC Analyst', 'Threat Intelligence', 'SOAR & Automation Engineer', 'DevSecOps', 'Cybersecurity Engineer'];
    var r = 0, i = 0, deleting = false;
    typed.textContent = '';
    (function tick() {
      var word = roles[r];
      typed.textContent = word.slice(0, i);
      if (!deleting && i < word.length) { i++; setTimeout(tick, 60); }
      else if (!deleting) { deleting = true; setTimeout(tick, 1800); }
      else if (i > 0) { i--; setTimeout(tick, 30); }
      else { deleting = false; r = (r + 1) % roles.length; setTimeout(tick, 300); }
    })();
  }

  // Blog helpers
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmtDate(d) {
    var dt = new Date(d + 'T00:00:00');
    return isNaN(dt) ? d : dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function byDate(a, b) { return a.date < b.date ? 1 : -1; }

  // Post list (home teaser + blog index)
  var list = document.getElementById('latest-posts');
  if (list) {
    var base = list.dataset.base || '';
    var limit = parseInt(list.dataset.limit, 10) || 0;
    fetch(base + 'posts.json')
      .then(function (res) { return res.json(); })
      .then(function (posts) {
        posts.sort(byDate);
        if (limit) posts = posts.slice(0, limit);
        list.innerHTML = posts.map(function (p) {
          return '<a class="post-item" href="/blog/' + encodeURIComponent(p.slug) + '">' +
            '<span class="post-date mono">' + esc(fmtDate(p.date)) + '</span>' +
            '<span class="post-main"><b>' + esc(p.title) + '</b><small>' + esc(p.summary || '') + '</small></span>' +
            '<span class="post-arrow" aria-hidden="true">→</span></a>';
        }).join('');
      })
      .catch(function () {
        list.innerHTML = '<p class="muted">Posts load when the site is served over http (GitHub Pages, Vercel or a local server).</p>';
      });
  }

  // Single post
  var body = document.getElementById('post-body');
  if (body) {
    // Clean URL: /blog/<slug> (rewritten to post.html by vercel.json); ?p=<slug> still works
    var m = location.pathname.match(/^\/blog\/([a-z0-9-]+)\/?$/i);
    var slug = (m && m[1] !== 'post') ? m[1] : (new URLSearchParams(location.search).get('p') || '');
    var titleEl = document.getElementById('post-title');
    if (!/^[a-z0-9-]+$/i.test(slug)) { titleEl.textContent = 'Post not found'; return; }
    Promise.all([
      fetch('/blog/posts.json').then(function (r) { return r.json(); }),
      fetch('/blog/posts/' + slug + '.md').then(function (r) { if (!r.ok) throw new Error('404'); return r.text(); })
    ]).then(function (res) {
      var meta = res[0].filter(function (p) { return p.slug === slug; })[0] || { title: slug, date: '' };
      document.title = meta.title + ' | Mohamed Amine Hammami';
      titleEl.textContent = meta.title;
      document.getElementById('post-meta').textContent = meta.date ? fmtDate(meta.date) : 'Blog';
      document.getElementById('post-tags').innerHTML = (meta.tags || []).map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('');
      body.innerHTML = window.marked ? window.marked.parse(res[1]) : '<pre>' + esc(res[1]) + '</pre>';
    }).catch(function () {
      titleEl.textContent = 'Post not found';
      body.innerHTML = '<p><a href="/blog">Back to all posts</a></p>';
    });
  }

  // Reveal on scroll
  var items = document.querySelectorAll('.sec h2, .job, .card, .skill, .prose, .list, .layers li, .pipeline li');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    items.forEach(function (n) { n.classList.add('reveal'); io.observe(n); });
  }

  // Active nav link for in-page sections
  var links = Array.prototype.filter.call(document.querySelectorAll('.nav-links a'), function (a) { return a.getAttribute('href').charAt(0) === '#'; });
  if (links.length && 'IntersectionObserver' in window) {
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          links.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id); });
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    links.forEach(function (a) { var s = document.querySelector(a.getAttribute('href')); if (s) so.observe(s); });
  }
})();
