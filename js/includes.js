// Robust include for sidebar/footer partials on GitHub Pages or local files.
// Also injects a "Back to Home" link on all pages except the home page.

async function fetchFirst(paths) {
  for (const url of paths) {
    try {
      const res = await fetch(url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now(), { cache: 'no-store' });
      if (res.ok) return await res.text();
    } catch (e) {
      // try next
    }
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

  const variants = [ clean, './' + clean, hereDir + clean ];
  if (repo) variants.push('/' + repo + '/' + clean);
  return [...new Set(variants)];
}

async function includeInto(el) {
  if (!el) return;
  const src = el.dataset.src || el.getAttribute('data-src');
  if (!src) return;

  const html = await fetchFirst(candidatePaths(src));
  if (html) {
    el.outerHTML = html;
  } else {
    console.error('Include failed for', src, 'tried:', candidatePaths(src));
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  // 1) Sidebar
  const sidebarHolder = document.getElementById('sidebar-include');
  await includeInto(sidebarHolder);

  // Highlight active link after sidebar is present
  const path = (location.pathname.split('/').pop() || 'index.html');
  document.querySelectorAll('.sidebar nav a').forEach(a => {
    const href = a.getAttribute('href') || '';
    if (href === path || href.startsWith(path + '?')) {
      a.setAttribute('aria-current', 'page');
    }
  });

  // 2) Footer
  const footerHolder = document.getElementById('footer-include');
  await includeInto(footerHolder);

  // 3) Year
  const yearEl = document.querySelector('[data-year], #y');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // 4) Inject "Back to Home" on every page EXCEPT the home page
  //    - Avoid duplicates if a page already has a .back-home element.
  const isHome = document.body.classList.contains('home') ||
                 /(?:^|\/)index\.html?$/.test(location.pathname);
  if (!isHome && !document.querySelector('.back-home')) {
    const linkWrap = document.createElement('p');
    linkWrap.className = 'back-home container';
    linkWrap.style.padding = '0 0 18px';
    linkWrap.innerHTML = '<a href="./">← Back to Home</a>';

    // Insert just before the footer include if present, otherwise append to <main>
    const footerAnchor = document.getElementById('footer-include');
    const main = document.querySelector('main') || document.body;
    if (footerAnchor && footerAnchor.parentNode) {
      footerAnchor.parentNode.insertBefore(linkWrap, footerAnchor);
    } else {
      main.appendChild(linkWrap);
    }
  }
});
