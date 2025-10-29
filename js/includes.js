// Robust include for sidebar/footer partials on GitHub Pages or local files.
// - Tries multiple URL variants (relative, ./, /<repo>/…)
// - Busts cache so updates appear
// - Highlights active nav link
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
  // Absolute or protocol URL? Use as-is.
  if (/^https?:\/\//i.test(src)) return [src];

  // Current page path, project root, and simple relatives
  const pathname = location.pathname;            // e.g. /ThoughtsInSilico/index.html
  const parts = pathname.split('/').filter(Boolean);
  const repo = parts.length ? parts[0] : '';     // e.g. ThoughtsInSilico
  const hereDir = pathname.replace(/[^/]*$/, ''); // e.g. /ThoughtsInSilico/

  // Normalize src without leading './'
  const clean = src.replace(/^.\//, '');

  const variants = [
    clean,                 // 'partials/sidebar.html'
    './' + clean,          // './partials/sidebar.html'
    hereDir + clean,       // '/ThoughtsInSilico/partials/sidebar.html'
  ];
  if (repo) variants.push('/' + repo + '/' + clean); // '/ThoughtsInSilico/partials/sidebar.html'

  // Deduplicate while preserving order
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
    // Optional visible fallback:
    // el.innerHTML = '<div style="color:#cfcac3">Failed to load: ' + src + '</div>';
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
});
