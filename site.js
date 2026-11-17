// Shared by every page of the site: draws the top bar (so the navigation is the same everywhere), the light/dark switch,
// and the pause button for the looping recordings on the cards. A page puts <header class="bar" id="bar" data-page="NAME"
// data-root="PATH TO THE SITE ROOT"></header> in its body and loads this before its own script, which then uses window.Site.
(() => {
  const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
  const bar = document.getElementById('bar'), root = bar.dataset.root || './', page = bar.dataset.page;
  const local = new URLSearchParams(location.search).has('local') ? '?local' : '';
  const ICON = {
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',
    resume: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5.5v13a1 1 0 0 0 1.5.9l10.5-6.5a1 1 0 0 0 0-1.8L8.5 4.6A1 1 0 0 0 7 5.5Z"/></svg>',
  };
  const here = (p) => (p === page ? ' aria-current="page"' : '');
  // the library is the home page, so its link is the root with the grid's hash
  bar.innerHTML = `
    <a class="brand" href="${root}${local}#/" aria-label="finktheartist's UI Library, home"><i aria-hidden="true"><b style="background:#000;outline:1px solid #555"></b><b style="background:#ecd7ac"></b><b style="background:#fff"></b><b style="background:#efe6d2"></b></i><span class="who" style="color:inherit;font-weight:650">finktheartist's</span> <span>UI Library</span></a>
    <nav aria-label="Site"><a href="${root}${local}#/" id="nav-lib"${here('library')}>Library</a><a href="${root}sets/${local}" id="nav-sets"${here('sets')}>Sets</a><a class="ext" href="https://github.com/finktheartist" target="_blank" rel="noopener">GitHub</a></nav>
    <div class="end">
      <button class="icon" id="motion" type="button"></button>
      <button class="icon" id="theme" type="button" aria-label="Switch light and dark" title="Switch light and dark">${ICON.moon}</button>
    </div>`;

  // theme: dark unless the reader picked light, remembered on this device for every page
  const setTheme = (t) => { document.documentElement.dataset.theme = t; store.set('lib-theme', t); };
  document.getElementById('theme').onclick = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  addEventListener('scroll', () => bar.classList.toggle('scrolled', scrollY > 4), { passive: true });

  // loops: a registered video plays while at least half of it is on screen. They start paused for anyone who asks for
  // reduced motion, and the pause button stops them all (remembered on this device for every page).
  const reduce = matchMedia('(prefers-reduced-motion: reduce)'), videos = new Set();
  let paused = store.get('lib-loops') ? store.get('lib-loops') === 'off' : reduce.matches;
  const seen = new IntersectionObserver((es) => es.forEach((e) => { e.target._seen = e.isIntersecting; play(e.target); }), { threshold: .5 });
  function play(v) {
    if (v._seen && !paused && !v._held) { if (v.preload !== 'auto') v.preload = 'auto'; v.play().then(() => v.classList.add('on')).catch(() => {}); }
    else v.pause();
  }
  function setPaused(p, save) {
    paused = p; if (save) store.set('lib-loops', p ? 'off' : 'on');
    const b = document.getElementById('motion'); b.innerHTML = p ? ICON.resume : ICON.pause; b.setAttribute('aria-pressed', p);
    b.title = p ? 'Play the card loops' : 'Pause the card loops'; b.setAttribute('aria-label', b.title);
    videos.forEach(play);
  }
  document.getElementById('motion').onclick = () => setPaused(!paused, true);
  setPaused(paused);

  window.Site = {
    store,
    // start watching a video; forget() stops (call it before removing the video)
    loop(v) { videos.add(v); seen.observe(v); },
    forget(v) { videos.delete(v); seen.unobserve(v); },
    clear() { videos.forEach((v) => seen.unobserve(v)); videos.clear(); },
    // hold a video still while something else (a live control) covers it, and let it go again
    hold(v, on) { v._held = on; play(v); },
  };
})();
