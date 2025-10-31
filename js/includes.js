// Robust include for sidebar/footer partials on GitHub Pages or local files.
// Injects a "Back to Home" link directly ABOVE the footer on all non-home pages.

async function fetchFirst(paths) {
  for (const url of paths) {
    try {
      const res = await fetch(url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now(), { cache: 'no-store' });
      if (res.ok) return await res.text();
    } catch (_) {}
  }
  return null;
}

function candidatePaths(src) {
  if (/^https?:\/\//i.test(src)) return [src];
  const pathname = location.pathname;
  const parts = pathname.split('/').filter(Boolean);
  const repo = parts.length ? parts[0] : '';
  const hereDir = pathname.replace(/[^/]*$/, '');
  const clean = src.replace(/^.\//, '');

  const variants = [clean, './' + clean, hereDir + clean];
  if (repo) variants.push('/' + repo + '/' + clean);
  return [...new Set(variants)];
}

async function includeInto(el) {
  if (!el) return;
  const src = el.dataset.src || el.getAttribute('data-src');
  if (!src) return;
  const html = await fetchFirst(candidatePaths(src));
  if (html) el.outerHTML = html;
  else console.error('Include failed for', src, 'tried:', candidatePaths(src));
}

// === Sidebar "Currently Listening" tracks (edit this list) ===
const SIDEBAR_TRACKS = [
  // Example entries — change to your files in /audio/
  { title: 'Cristo Redentor (composer: Duke Pearson)', src: 'audio/cristo-redentor.mp3' },
  // { title: 'Schubert: Death and the Maiden — I. Allegro (Takács)', src: 'audio/schubert-datm-i-takacs.mp3' },
];


document.addEventListener('DOMContentLoaded', async () => {
  // 1) Sidebar
  await includeInto(document.getElementById('sidebar-include'));
  // Hamburger toggle (desktop + phone)
  const hb = document.querySelector('.hamburger');
  if (hb) hb.addEventListener('click', () => {
    document.body.classList.toggle('nav-open');
  });

  // ---- Sidebar "Currently Listening" wiring ----
  (function(){
    const list  = document.getElementById('sl-list');
    const audio = document.getElementById('sl-audio');
    if (!list || !audio) return; // partial not present
  
    function renderSidebarList(active = -1){
      list.innerHTML = SIDEBAR_TRACKS.length
        ? SIDEBAR_TRACKS.map((t,i)=>
            `<li><button type="button" data-i="${i}" ${i===active?'aria-current="true"':''}>${t.title}</button></li>`
          ).join('')
        : '<li><em>Add tracks in <code>audio/</code>…</em></li>';
        }
  
    renderSidebarList();
  
    list.addEventListener('click', e=>{
      const btn = e.target.closest('button[data-i]'); if(!btn) return;
      const i = +btn.dataset.i;
      audio.src = SIDEBAR_TRACKS[i].src;
      audio.play().catch(()=>{});
      renderSidebarList(i);
  });

  // Optional: auto-load first track (but don’t autoplay):
  // if (SIDEBAR_TRACKS.length){ audio.src = SIDEBAR_TRACKS[0].src; renderSidebarList(0); }
})();


  // Highlight active link after sidebar is present
  const path = (location.pathname.split('/').pop() || 'index.html');
  document.querySelectorAll('.sidebar nav a').forEach(a => {
    const href = a.getAttribute('href') || '';
    if (href === path || href.startsWith(path + '?')) a.setAttribute('aria-current', 'page');
  });

  // 2) Footer
  await includeInto(document.getElementById('footer-include'));

  // 3) Year
  const yearEl = document.querySelector('[data-year], #y');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // 4) Inject "Back to Home" ABOVE the footer on all non-home pages
  const isHome = document.body.classList.contains('home') || /(?:^|\/)index\.html?$/.test(location.pathname);
  if (!isHome) {
    const footerEl = document.querySelector('main footer') || document.querySelector('footer');
    const linkWrap = document.createElement('p');
    linkWrap.className = 'back-home container';
    linkWrap.style.padding = '0 0 18px';
    linkWrap.innerHTML = '<a href="./">← Back to Home</a>';

    if (footerEl && footerEl.parentNode) {
      footerEl.parentNode.insertBefore(linkWrap, footerEl); // directly above footer
    } else {
      (document.querySelector('main') || document.body).appendChild(linkWrap);
    }
  }

  // ---- Proportional panel sizing for the about page columns ----
  function proportionalize(colSelector){
    const col = document.querySelector(colSelector);
    if (!col) return;
    const panels = Array.from(col.querySelectorAll('.panel'));
    if (panels.length < 2) return;

    // Measure each panel's natural content height (no constraints)
    const measures = panels.map(p => {
      // temporarily let it size naturally to measure content
      const prev = p.style.flex;
      p.style.flex = '0 0 auto';
      const h = p.scrollHeight;
      p.style.flex = prev;
      return h;
    });

    const total = measures.reduce((a,b)=>a+b,0) || 1;

    // If everything is empty (both ~equal tiny), make them 1:1
    const allTiny = measures.every(h => h < 8);

    panels.forEach((p, i) => {
      const grow = allTiny ? 1 : measures[i] / total; // proportional split
      p.style.flex = `${grow} 1 0px`;
    });
  }

  // Apply to both columns on the Vat-brain page
  proportionalize('.about-left');
  proportionalize('.about-right');

});
