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


// --- Global replacement-noise overlay (per-pixel, animated, DPR-aware)
(function(){
  // Binary entropy H(p) in bits; used for readout of H(N)=1 bit for fair B/W
  function entropy2(p){
    if (p<=0 || p>=1) return 0;
    return -(p*Math.log2(p) + (1-p)*Math.log2(1-p));
  }
  const H_NOISE = 1; // fair black/white noise has 1 bit/pixel

  function makeRenderer(canvas){
    const ctx = canvas.getContext('2d', { willReadFrequently: false });

    let cssW = 0, cssH = 0, dpr = 1, W = 0, H = 0;
    let mask     = null; // Uint8Array: 1=replace, 0=keep
    let noiseVal = null; // Uint8Array: 0 or 255 (B/W) where replacing
    let rgba     = null; // Uint8ClampedArray for frame RGBA
    let stableMask = false; // reuse mask across frames if true

    // Offscreen work surface (optional performance)
    const hasOffscreen = typeof OffscreenCanvas !== 'undefined';
    const work = hasOffscreen ? new OffscreenCanvas(1,1) : document.createElement('canvas');
    const wctx = work.getContext('2d');

    function ensureBuffers(){
      const need = W*H;
      if (!mask || mask.length !== need){
        mask     = new Uint8Array(need);
        noiseVal = new Uint8Array(need);
        rgba     = new Uint8ClampedArray(need*4);
      }
    }

    function resize(){
      const newCssW = window.innerWidth|0;
      const newCssH = window.innerHeight|0;
      const newDpr  = Math.max(1, Math.round(window.devicePixelRatio || 1));

      if (newCssW === cssW && newCssH === cssH && newDpr === dpr) return;

      cssW = newCssW; cssH = newCssH; dpr = newDpr;
      W = canvas.width  = cssW * dpr;
      H = canvas.height = cssH * dpr;
      canvas.style.width  = cssW + 'px';
      canvas.style.height = cssH + 'px';

      work.width  = W; work.height = H;

      mask = noiseVal = rgba = null;
      ensureBuffers();
    }

    function fillBernoulliMask(q){
      // threshold in [0..255]
      const T = Math.floor(q * 255);
      // Fill with crypto RNG and threshold
      crypto.getRandomValues(mask);
      for (let i=0;i<mask.length;i++){
        // mask[i] is 0..255; <= T => replace (prob ~ q)
        mask[i] = (mask[i] <= T) ? 1 : 0;
      }
    }

    function fillNoiseBW(){
      // Each byte random; use lowest bit to choose 0 or 255 (unbiased)
      crypto.getRandomValues(noiseVal);
      for (let i=0;i<noiseVal.length;i++){
        noiseVal[i] = (noiseVal[i] & 1) ? 255 : 0;
      }
    }

    function composeFrame(){
      // For each pixel: if mask=1 -> write noise (opaque); else alpha=0 (keep page pixel)
      const n = W*H;
      for (let i=0, j=0; i<n; i++, j+=4){
        if (mask[i]){
          const v = noiseVal[i];
          rgba[j] = rgba[j+1] = rgba[j+2] = v;
          rgba[j+3] = 255; // opaque: true replacement (no blending)
        }else{
          rgba[j] = rgba[j+1] = rgba[j+2] = 0;
          rgba[j+3] = 0;   // transparent: keep underlying page pixel
        }
      }
    }

    function blit(){
      const frame = new ImageData(rgba, W, H);
      wctx.putImageData(frame, 0, 0);
      ctx.clearRect(0,0,cssW,cssH);
      ctx.drawImage(work, 0, 0, W, H, 0, 0, cssW, cssH); // scale to CSS pixels
    }

    return {
      setStableMask(v){ stableMask = !!v; },
      render(q){
        ensureBuffers();
        // (Re)build mask each frame unless stable
        if (!stableMask) fillBernoulliMask(q);
        else if (!mask) fillBernoulliMask(q); // first time

        // Always regenerate noise (flicker); spec: unbiased B/W
        fillNoiseBW();

        composeFrame();
        blit();
      },
      resize
    };
  }

  function init(){
    const ui = document.querySelector('[data-entropy-global]');
    if (!ui) return;

    // Full-screen overlay canvas; pointer-events: none via CSS.
    const overlay = document.createElement('canvas');
    overlay.className = 'entropy-overlay';
    document.body.appendChild(overlay);

    const range  = ui.querySelector('#entropy-range');
    const stable = ui.querySelector('#entropy-stable');
    const out    = ui.querySelector('[data-entropy-out]');

    const renderer = makeRenderer(overlay);
    renderer.resize();
    window.addEventListener('resize', renderer.resize, { passive: true });

    let q = +range.value || 0;             // replacement probability (slider maps directly)
    let running = false;
    const targetFPS = 24;
    const frameMS = Math.round(1000 / targetFPS);
    let last = 0;

    function updateReadout(){
      // H(N)=1 bit/pixel for fair B/W; injected = q * H(N) = q
      const bits = (q * 1).toFixed(3);
      const pct  = Math.round(q * 100);
      out.textContent = `Injected noise: q × H(N) = ${bits} bits/pixel • Noise probability: ${pct}%`;
    }

    function loop(t){
      if (!running) return;
      if (q === 0){
        const ctx = overlay.getContext('2d');
        ctx.clearRect(0,0,overlay.width,overlay.height);
        running = false;
        return;
      }
      if (t - last >= frameMS){
        last = t;
        renderer.render(q);
      }
      requestAnimationFrame(loop);
    }

    function maybeRun(){
      updateReadout();
      if (q === 0){
        running = false;
        const ctx = overlay.getContext('2d');
        ctx.clearRect(0,0,overlay.width,overlay.height);
        return;
      }
      if (!running){
        running = true;
        requestAnimationFrame(loop);
      }
    }

    range.addEventListener('input', ()=>{
      q = Math.min(1, Math.max(0, +range.value));
      maybeRun();
    });

    stable.addEventListener('change', ()=>{
      renderer.setStableMask(stable.checked); // reuse mask across frames when checked
      // immediate refresh
      maybeRun();
    });

    // Initial paint/readout
    updateReadout();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
