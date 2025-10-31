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


// ---- Global, single audio player (fixed bottom-right) ----
window.GlobalPlayer = (function () {
  let shell, titleEl, audio;

  function ensure() {
    if (shell) return;
    shell = document.createElement('div');
    shell.id = 'global-player';
    Object.assign(shell.style, {
      position: 'fixed',
      right: '16px',
      bottom: '16px',
      zIndex: 4000,
      maxWidth: 'min(520px, 90vw)',
      background: 'rgba(12,14,18,.92)',
      border: '1px dashed rgba(255,255,255,.4)',
      borderRadius: '14px',
      padding: '10px',
      boxShadow: '0 10px 30px rgba(0,0,0,.45)',
      display: 'none',
      color: '#e8e6e3',
      backdropFilter: 'blur(6px)',
    });

    titleEl = document.createElement('div');
    titleEl.id = 'global-player-title';
    titleEl.style.margin = '0 0 6px';
    titleEl.style.fontWeight = '700';

    audio = document.createElement('audio');
    audio.id = 'global-audio';
    audio.controls = true;
    audio.preload = 'none';
    audio.style.width = '100%';

    // ✕ close button
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'gp-close';
    closeBtn.setAttribute('aria-label', 'Close player');
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', () => {
      audio.pause();
      shell.style.display = 'none';
    });

    // Append in this order so the ✕ sits on top-right
    shell.appendChild(closeBtn);
    shell.appendChild(titleEl);
    shell.appendChild(audio);
    
    document.body.appendChild(shell);
  }

  return {
    /** Play a track: {title, src} */
    play(track) {
      ensure();
      if (!track || !track.src) return;
      if (audio.src !== new URL(track.src, location.href).href) {
        audio.src = track.src;
      }
      titleEl.textContent = track.title || '';
      shell.style.display = 'block';
      audio.play().catch(() => {});
    },
    pause() { ensure(); audio.pause(); },
    isActive() { return !!audio && !audio.paused; },
  };
})();


// === Sidebar "Currently Listening" tracks (edit this list) ===
const SIDEBAR_TRACKS = [
  { title: 'Cristo Redentor (composer: Duke Pearson)', src: 'audio/cristo-redentor.mp3' },
  // { title: 'Schubert: Death and the Maiden — I. Allegro (Takács)', src: 'audio/schubert-datm-i-takacs.mp3' },
];

document.addEventListener('DOMContentLoaded', async () => {
  // 1) Sidebar
  await includeInto(document.getElementById('sidebar-include'));

  // 2) Hamburger toggle
  const hb = document.getElementById('navToggle') || document.querySelector('.hamburger');
  if (hb) {
    hb.addEventListener('click', () => {
      const open = !document.body.classList.contains('nav-open');
      document.body.classList.toggle('nav-open', open);
      hb.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // 3) Sidebar "Currently Listening" wiring (uses GlobalPlayer)
  {
    const list  = document.getElementById('sl-list');
    const nowEl = document.getElementById('sl-now');

    if (list) {
      function render(active = -1) {
        list.innerHTML = SIDEBAR_TRACKS.length
          ? SIDEBAR_TRACKS.map((t,i)=>
              `<li><button type="button" data-i="${i}" ${i===active?'aria-current="true"':''}>${t.title}</button></li>`
            ).join('')
          : '<li><em>Add tracks in <code>audio/</code>…</em></li>';
      }

      render();

      list.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-i]');
        if (!btn) return;
        const i = +btn.dataset.i;
        const track = SIDEBAR_TRACKS[i];

        window.GlobalPlayer.play(track);
        if (nowEl) nowEl.textContent = track.title || '';
        render(i);
      });
    }
  }
  // Optional: auto-load first track (but don’t autoplay):
  // if (SIDEBAR_TRACKS.length){ window.GlobalPlayer.play(SIDEBAR_TRACKS[0]); }

  // 4) Highlight active link after sidebar is present
  const path = (location.pathname.split('/').pop() || 'index.html');
  document.querySelectorAll('.sidebar nav a').forEach(a => {
    const href = a.getAttribute('href') || '';
    if (href === path || href.startsWith(path + '?')) a.setAttribute('aria-current', 'page');
  });

  // 5) Footer
  await includeInto(document.getElementById('footer-include'));

  // 6) Year
  const yearEl = document.querySelector('[data-year], #y');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // 7) Inject "Back to Home" ABOVE the footer on all non-home pages
  const isHome = document.body.classList.contains('home') || /(?:^|\/)index\.html?$/.test(location.pathname);
  if (!isHome) {
    const footerEl = document.querySelector('main footer') || document.querySelector('footer');
    const linkWrap = document.createElement('p');
    linkWrap.className = 'back-home container';
    linkWrap.style.padding = '0 0 18px';
    linkWrap.innerHTML = '<a href="./">← Back to Home</a>';

    if (footerEl && footerEl.parentNode) {
      footerEl.parentNode.insertBefore(linkWrap, footerEl);
    } else {
      (document.querySelector('main') || document.body).appendChild(linkWrap);
    }
  }

  // 8) Proportional panel sizing for the about page columns
  function proportionalize(colSelector){
    const col = document.querySelector(colSelector);
    if (!col) return;
    const panels = Array.from(col.querySelectorAll('.panel'));
    if (panels.length < 2) return;

    const measures = panels.map(p => {
      const prev = p.style.flex;
      p.style.flex = '0 0 auto';
      const h = p.scrollHeight;
      p.style.flex = prev;
      return h;
    });

    const total = measures.reduce((a,b)=>a+b,0) || 1;
    const allTiny = measures.every(h => h < 8);

    panels.forEach((p, i) => {
      const grow = allTiny ? 1 : measures[i] / total;
      p.style.flex = `${grow} 1 0px`;
    });
  }

  proportionalize('.about-left');
  proportionalize('.about-right');
});


// --- Global Shannon-entropy static overlay (driven by a continuous slider)
(function(){
  function entropy2(p){ 
    if (p<=0 || p>=1) return 0; 
    return -(p*Math.log2(p) + (1-p)*Math.log2(1-p)); 
  }
  function clamp(x,min,max){ return x<min?min:(x>max?max:x); }

  function drawStatic(canvas, p){
    const ctx = canvas.getContext('2d');
    const w = window.innerWidth | 0;
    const h = window.innerHeight | 0;
    if (canvas.width !== w || canvas.height !== h){ canvas.width = w; canvas.height = h; }
    const n = w*h;
    const buf = new Uint8ClampedArray(n*4);
    for (let i=0;i<n;i++){
      const v = (Math.random() < p) ? 255 : 0; // binary noise by probability p
      const j = i*4;
      buf[j]=buf[j+1]=buf[j+2]=v; buf[j+3]=255;
    }
    ctx.putImageData(new ImageData(buf, w, h), 0, 0);
  }

  function initGlobalEntropyUI(){
    const ui = document.querySelector('[data-entropy-global]');
    if (!ui) return; // only activate on pages that include the slider

    // Create overlay canvas that affects the whole page
    const overlay = document.createElement('canvas');
    overlay.className = 'entropy-overlay';
    document.body.appendChild(overlay);

    const range = ui.querySelector('input[type="range"]');
    const out = ui.querySelector('[data-entropy-out]');

    let p = +range.value || 0; // probability of white pixels
    function render(){
      // Redraw noise and set visual strength via opacity
      drawStatic(overlay, p);
      overlay.style.opacity = (p === 0 ? 0 : Math.min(1, p * 0.95));
      if (out) out.textContent = entropy2(clamp(p, 0.0005, 0.9995)).toFixed(3) + ' bits';
    }

    range.addEventListener('input', () => { p = clamp(+range.value, 0, 1); render(); });

    window.addEventListener('resize', render, { passive: true });
    render();
  }

  document.addEventListener('DOMContentLoaded', initGlobalEntropyUI);
})();
