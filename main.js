// ============================================================
// NESTLY PARENTING — main.js
// Shared across all pages: navbar toggle + nav search
// ============================================================

/** Toggle mobile nav */
function toggleNav() {
  const links = document.getElementById('navLinks');
  const toggle = document.querySelector('.nav-toggle');
  if (!links) return;
  const isOpen = links.classList.toggle('open');
  if (toggle) toggle.setAttribute('aria-expanded', String(isOpen));
}

/** Close mobile nav on outside click */
document.addEventListener('click', function (e) {
  const links = document.getElementById('navLinks');
  const toggle = document.querySelector('.nav-toggle');
  if (links && toggle && !links.contains(e.target) && !toggle.contains(e.target)) {
    links.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }
});

/**
 * Nav search: pressing Enter on the navbar search
 * redirects to articles.html with a pre-filled query
 *
 * Uses a root-relative path ("/articles.html") rather than a plain
 * relative one, because this script is shared across pages at two
 * different folder depths (site root, and /blog/). A plain relative
 * "articles.html" resolves to the wrong location (blog/articles.html,
 * which does not exist) when triggered from any article page.
 */
function handleNavSearch(event) {
  if (event.key === 'Enter') {
    const query = document.getElementById('navSearch').value.trim();
    if (query) {
      window.location.href = '/articles.html?q=' + encodeURIComponent(query);
    }
  }
}
