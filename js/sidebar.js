<script>
// Simple sidebar include + active link highlighter.
// Works on any page that has: <div id="sidebar-include" data-src="partials/sidebar.html"></div>
document.addEventListener('DOMContentLoaded', async () => {
  const holder = document.getElementById('sidebar-include');
  if (!holder) return;

  try {
    const res = await fetch(holder.dataset.src || 'partials/sidebar.html');
    const html = await res.text();
    holder.outerHTML = html;

    const path = (location.pathname.split('/').pop() || 'index.html');
    document.querySelectorAll('.sidebar nav a').forEach(a => {
      const href = a.getAttribute('href') || '';
      if (href === path || href.startsWith(path + '?')) {
        a.setAttribute('aria-current', 'page');
      }
    });
  } catch (e) {
    console.error('Sidebar include failed:', e);
  }
});
</script>
