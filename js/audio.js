<script>
// Very small global audio manager
(function () {
  const KEY = 'globalAudioState:v1';

  function save(state) {
    try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  }
  function load() {
    try { return JSON.parse(sessionStorage.getItem(KEY) || '{}'); } catch { return {}; }
  }

  // UI shell (hidden until playing)
  const shell = document.createElement('div');
  shell.id = 'global-player';
  shell.innerHTML = `
    <div class="gp-card">
      <button class="gp-close" aria-label="Pause & hide">✕</button>
      <div class="gp-title" id="gpTitle"></div>
      <audio id="gpAudio" preload="none" controls></audio>
    </div>`;
  document.addEventListener('DOMContentLoaded', () => document.body.appendChild(shell));

  const AudioManager = {
    play(src, title) {
      const a = document.getElementById('gpAudio'), t = document.getElementById('gpTitle');
      if (!a || !t) return;

      // if switching track, set new src
      if (a.src !== new URL(src, location.href).href) a.src = src;
      t.textContent = title || '';

      shell.classList.add('on');
      a.play().catch(()=>{});
      save({ src, title, when: Date.now(), paused:false, time:a.currentTime||0 });

      // let pages update “now playing” chips
      window.dispatchEvent(new CustomEvent('audio:now', { detail: { src, title, playing:true }}));
    },
    pause() {
      const a = document.getElementById('gpAudio');
      if (!a) return;
      a.pause();
      save({ ...load(), paused:true, time:a.currentTime||0 });
      shell.classList.remove('on');
      window.dispatchEvent(new CustomEvent('audio:now', { detail: { playing:false }}));
    },
    resumeFromState() {
      const a = document.getElementById('gpAudio'), t = document.getElementById('gpTitle');
      if (!a || !t) return;
      const st = load();
      if (!st.src) return;

      a.src = st.src;
      t.textContent = st.title || '';
      a.currentTime = st.time || 0;

      if (!st.paused) {
        shell.classList.add('on');
        a.play().catch(()=>{});
      }
    }
  };

  window.AudioManager = AudioManager;

  // wire close button + save progress
  document.addEventListener('click', e => {
    if (e.target.closest('.gp-close')) AudioManager.pause();
  });
  document.addEventListener('timeupdate', e => {
    const a = e.target;
    if (a && a.id === 'gpAudio') save({ ...load(), time:a.currentTime||0 });
  }, true);

  // restore on load
  document.addEventListener('DOMContentLoaded', () => AudioManager.resumeFromState());
})();
</script>
