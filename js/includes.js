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


// --- Global replacement-noise overlay (ES5, DPR-correct, per-pixel replacement)
(function(){
  // Fair black/white noise has H(N)=1 bit/pixel
  var H_NOISE = 1;

  function makeRenderer(canvas){
    var ctx = canvas.getContext('2d');

    // CSS size & DPR
    var cssW = 0, cssH = 0, dpr = 1, W = 0, H = 0;

    // Reused buffers
    var mask = null;   // Uint8Array (1=replace, 0=keep)
    var r32  = null;   // Uint32Array (RNG)
    var noise= null;   // Uint8Array (0 or 255)
    var frame= null;   // ImageData (RGBA)

    // Stable positions (mask)
    var stableMask = false;
    var lastQ = -1;

    
    // Fill a typed array with crypto RNG in <=65536-byte chunks.
    // Returns true if crypto was used; false if crypto is unavailable.
    function cryptoFill(view){
      if (!(typeof window.crypto !== 'undefined' &&
            typeof window.crypto.getRandomValues === 'function')) return false;
      var n = view.length;
      var step = Math.floor(65536 / view.BYTES_PER_ELEMENT); // bytes per call limit
      for (var i = 0; i < n; i += step){
        window.crypto.getRandomValues(view.subarray(i, Math.min(n, i + step)));
      }
      return true;
    }


    function safeCrypto(){
      return (typeof window.crypto !== 'undefined' &&
              typeof window.crypto.getRandomValues === 'function');
    }

    function resize(){
      // Avoid 0×0 on some engines at DOMContentLoaded
      var cw = Math.max((document.documentElement.clientWidth||0), (window.innerWidth||0));
      var ch = Math.max((document.documentElement.clientHeight||0), (window.innerHeight||0));
      var nd = (window.devicePixelRatio || 1);

      if (cw === cssW && ch === cssH && nd === dpr) return;

      cssW = cw; cssH = ch; dpr = nd;
      W = Math.max(1, Math.round(cssW * dpr));
      H = Math.max(1, Math.round(cssH * dpr));

      canvas.width  = W;
      canvas.height = H;
      canvas.style.width  = cssW + 'px';
      canvas.style.height = cssH + 'px';

      var n = W * H;
      mask = new Uint8Array(n);
      r32  = new Uint32Array(n);
      noise= new Uint8Array(n);
      // Context-bound ImageData (safer than new ImageData on WebKit)
      frame = ctx.createImageData(W, H);

      lastQ = -1; // force new density after resize
    }

    function bernoulliMask(q){
      var n = mask.length;
      var thr = Math.floor(q * 4294967296); // q * 2^32
      if (cryptoFill(r32)){
        for (var i=0;i<n;i++) mask[i] = (r32[i] < thr) ? 1 : 0;
      } else {
        var scale = 4294967296;
        for (var j=0;j<n;j++) mask[j] = (((Math.random()*scale)|0) < thr) ? 1 : 0;
      }
      lastQ = q;
    }


    function fillBW(){
      var n = noise.length;
      if (cryptoFill(noise)){
        for (var i=0;i<n;i++) noise[i] = (noise[i] & 1) ? 255 : 0;
      } else {
        for (var j=0;j<n;j++) noise[j] = (Math.random() < 0.5) ? 255 : 0;
      }
    }


    function compose(){
      var d = frame.data; // Uint8ClampedArray
      var n = mask.length;
      var i=0, j=0, v=0;
      for (; i<n; i++, j+=4){
        if (mask[i]){
          v = noise[i];
          d[j]=d[j+1]=d[j+2]=v; d[j+3]=255;   // opaque replacement
        } else {
          d[j]=d[j+1]=d[j+2]=0; d[j+3]=0;     // transparent (keep page pixel)
        }
      }
    }

    function blit(){
      // Force full replacement so prior alpha state can’t hide pixels
      var prev = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = 'copy';
      ctx.putImageData(frame, 0, 0);  // internal pixels (W,H)
      ctx.globalCompositeOperation = prev || 'source-over';
    }

    return {
      setStable: function(v){ stableMask = !!v; },
      resize: resize,
      render: function(q){
        if (!frame) resize();

        // Rebuild positions every frame unless stable; if stable, rebuild on q change
        if (!stableMask || lastQ !== q) bernoulliMask(q);

        // Always refresh noise values (flicker)
        fillBW();

        compose();
        blit();
      }
    };
  }

  function init(){
    // Always initialise overlay; controls are optional
    var overlay = document.createElement('canvas');
    overlay.className = 'entropy-overlay';
    document.body.appendChild(overlay);

    var renderer = makeRenderer(overlay);
    renderer.resize();
    window.addEventListener('resize', renderer.resize, false);

    // Controls (optional)
    var ui     = document.querySelector('[data-entropy-global]');
    var range  = ui ? ui.querySelector('#entropy-range') : null;
    var stable = ui ? ui.querySelector('#entropy-stable') : null;
    var out    = ui ? ui.querySelector('[data-entropy-out]') : null;

    var q = range ? Math.min(1, Math.max(0, parseFloat(range.value)||0)) : 1;
    var fps = 24, frameMS = Math.round(1000 / fps);
    var last = 0;

    function updateReadout(){
      if (!out) return;
      var bits = (q * H_NOISE).toFixed(3);
      var pct  = Math.round(q * 100);
      out.textContent = 'Injected noise: q × H(N) = ' + bits +
        ' bits/pixel (fair B/W, H(N)=1) • Noise probability: ' + pct + '%';
    }

    function loop(t){
      if (!last) last = 0;
      if (q === 0){
        var c = overlay.getContext('2d');
        c.clearRect(0, 0, overlay.width, overlay.height);
      } else if (t - last >= frameMS){
        last = t;
        renderer.render(q);
      }
      window.requestAnimationFrame(loop);
    }

    if (range){
      var setFromRange = function(){
        q = Math.min(1, Math.max(0, parseFloat(range.value)||0));
        updateReadout();
      };
      range.addEventListener('input', setFromRange, false);
      range.addEventListener('change', setFromRange, false);
    }
    if (stable){
      stable.addEventListener('change', function(){
        renderer.setStable(!!stable.checked);
      }, false);
    }

    updateReadout();
    window.requestAnimationFrame(loop);
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, false);
  } else {
    init();
  }
})();

