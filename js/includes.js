<script>
document.addEventListener('DOMContentLoaded', async () => {
  async function includeInto(el){
    if(!el) return;
    const src = el.dataset.src || el.getAttribute('data-src');
    if(!src) return;
    try{
      const res = await fetch(src);
      el.outerHTML = await res.text();
    }catch(e){
      console.error('Include failed:', src, e);
    }
  }

  // 1) Sidebar
  const sidebarHolder = document.getElementById('sidebar-include');
  await includeInto(sidebarHolder);

  // Highlight active link after sidebar is in the DOM
  const path = (location.pathname.split('/').pop() || 'index.html');
  document.querySelectorAll('.sidebar nav a').forEach(a=>{
    const href = a.getAttribute('href') || '';
    if (href === path || href.startsWith(path+'?')) a.setAttribute('aria-current','page');
  });

  // 2) Footer
  const footerHolder = document.getElementById('footer-include');
  await includeInto(footerHolder);

  // Set year (works whether footer uses [data-year] or #y)
  const yearEl = document.querySelector('[data-year], #y');
  if(yearEl) yearEl.textContent = new Date().getFullYear();
});
</script>
