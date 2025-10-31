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


// --- Global replacement-noise overlay (per-pixel, animated, DPR-correct, exact q)
(function(){
  const H_NOISE = 1; // fair black/white noise: 1 bit/pixel
  const hasCrypto = typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function';
  
  function makeRenderer(canvas){
    const ctx = canvas.getContext('2d');

    // CSS size & DPR
    let cssW = 0, cssH = 0, dpr = 1, W = 0, H = 0;

    // Reused buffers
    let mask = null;        // Uint8Array, 1=replace, 0=keep
    let noiseVal = null;    // Uint8Array, 0 or 255
    let frame = null;       // ImageData (reused)
    let rand32 = null;      // Uint32Array reused for exact Bernoulli(q)

    

    // Stable mask (positions) & which q it encodes
    let stableMask = false;
    let lastQ = -1;


    function ensureBuffers(){
      const need = W * H;
      if (!mask || mask.length !== need){
        mask     = new Uint8Array(need);
        noiseVal = new Uint8Array(need);
        frame    = new ImageData(W, H);   // browser-allocated backing store
        rand32   = new Uint32Array(need); // reused RNG buffer
      }
    }

    

    function resize(){
      const newCssW = window.innerWidth  | 0;
      const newCssH = window.innerHeight | 0;
      const newDpr  = (window.devicePixelRatio || 1); // keep fractional DPR
      if (newCssW === cssW && newCssH === cssH && newDpr === dpr) return;

      cssW = newCssW; cssH = newCssH; dpr = newDpr;
      W = Math.round(cssW * dpr);
      H = Math.round(cssH * dpr);

      canvas.width  = W;
      canvas.height = H;
      canvas.style.width  = cssW + 'px';
      canvas.style.height = cssH + 'px';

      mask = noiseVal = frame = null;
      ensureBuffers();
      lastQ = -1; // force mask rebuild next frame
    }


    function fillMaskExact(q){
      const n = W * H;
      const threshold = Math.floor(q * 4294967296); // q * 2^32
      if (hasCrypto){
        crypto.getRandomValues(rand32);   // fill in-place; no per-frame allocation
        for (let i=0;i<n;i++){
          mask[i] = (rand32[i] < threshold) ? 1 : 0;
        }
      } else {
        const scale = 4294967296;
        for (let i=0;i<n;i++){
          mask[i] = ((Math.random() * scale) | 0) < threshold ? 1 : 0;
        }
      }
      lastQ = q;
    }


    function fillNoiseBW(){
      const n = W * H;
      if (hasCrypto){
        const r = new Uint8Array(n);
        crypto.getRandomValues(r);
        for (let i=0;i<n;i++){
          noiseVal[i] = (r[i] & 1) ? 255 : 0;
        }
      }else{
        for (let i=0;i<n;i++){
          noiseVal[i] = (Math.random() < 0.5) ? 255 : 0;
        }
      }
    }

    

    // Compose directly into frame.data (RGBA in internal pixels)
    function composeFrame(){
      const data = frame.data; // Uint8ClampedArray
      const n = W * H;
      for (let i=0, j=0; i<n; i++, j+=4){
        if (mask[i]){
          const v = noiseVal[i];
          data[j] = data[j+1] = data[j+2] = v;
          data[j+3] = 255; // opaque -> replacement (no blending)
        }else{
          data[j] = data[j+1] = data[j+2] = 0;
          data[j+3] = 0;   // transparent -> keep page pixel
        }
      }
    }

    // Blit using internal pixel units (W,H)
    function blit(){
      ctx.putImageData(frame, 0, 0);
    }

    return {
      setStableMask(v){ stableMask = !!v; },
      resize,
      render(q){
        ensureBuffers();
        // Rebuild positions if not stable, or if q changed while stable
        if (!stableMask || lastQ !== q){
          fillMaskExact(q);
        }
        // Always refresh noise values for flicker (twinkle)
        fillNoiseBW();
        composeFrame();
        blit();
      }
    };
  }

  function init(){
    const ui = document.querySelector('[data-entropy-global]');
    if (!ui) return;

    const overlay = document.createElement('canvas');
    overlay.className = 'entropy-overlay';
    document.body.appendChild(overlay);

    const range  = ui.querySelector('#entropy-range');
    const stable = ui.querySelector('#entropy-stable');
    const out    = ui.querySelector('[data-entropy-out]');

    const renderer = makeRenderer(overlay);
    renderer.resize();
    window.addEventListener('resize', renderer.resize, { passive: true });

    let q = +range.value || 0;     // replacement probability
    const fps = 24, frameMS = Math.round(1000 / fps);
    let last = 0;

    function updateReadout(){
      if (!out) return;
      const bits = (q * H_NOISE).toFixed(3);
      const pct  = Math.round(q * 100);
      out.textContent = `Injected noise: q × H(N) = ${bits} bits/pixel (fair B/W, H(N)=1) • Noise probability: ${pct}%`;
    }


    function loop(t){
      // Clear when q==0 and skip drawing, but keep the loop alive.
      if (q === 0){
        const c = overlay.getContext('2d');
        c.clearRect(0, 0, overlay.width, overlay.height);
      }else{
        // ~24 FPS throttling
        if (!loop.last) loop.last = 0;
        if (t - loop.last >= frameMS){
          loop.last = t;
          renderer.render(q);
        }
      }
      requestAnimationFrame(loop);
    }

  

    range.addEventListener('input', ()=>{
      q = Math.min(1, Math.max(0, +range.value));
      updateReadout();
    });
    range.addEventListener('change', ()=>{
      q = Math.min(1, Math.max(0, +range.value));
      updateReadout();
    });


    stable.addEventListener('change', ()=>{
      renderer.setStableMask(stable.checked);
    });


    updateReadout(); // initial
    requestAnimationFrame(loop);
  }

  document.addEventListener('DOMContentLoaded', init);
})();




