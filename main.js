// ============================================================
// NESTLY PARENTING — main.js
// Shared across all pages: navbar toggle + nav search
// ============================================================

/** Toggle mobile nav */
function toggleNav() {
  const links = document.getElementById('navLinks');
  if (links) links.classList.toggle('open');
}

/** Close mobile nav on outside click */
document.addEventListener('click', function (e) {
  const links = document.getElementById('navLinks');
  const toggle = document.querySelector('.nav-toggle');
  if (links && toggle && !links.contains(e.target) && !toggle.contains(e.target)) {
    links.classList.remove('open');
  }
});

/**
 * Nav search: pressing Enter on the navbar search
 * redirects to articles.html with a pre-filled query
 */
function handleNavSearch(event) {
  if (event.key === 'Enter') {
    const query = document.getElementById('navSearch').value.trim();
    if (query) {
      window.location.href = 'articles.html?q=' + encodeURIComponent(query);
    }
  }
}
