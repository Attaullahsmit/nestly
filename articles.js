// ============================================================
// NESTLY PARENTING — articles.js
// Blog search + category filtering
// ============================================================

let activeCategory = 'all';

/** Called by category filter buttons */
function setFilter(btn, cat) {
  // Update active button style
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  activeCategory = cat;
  filterArticles();
}

/** Runs on every keystroke in the search input AND on filter change */
function filterArticles() {
  const query = (document.getElementById('articleSearch').value || '').trim().toLowerCase();
  const items = document.querySelectorAll('.article-item');
  let visible = 0;

  items.forEach(function (item) {
    const title = (item.dataset.title || '').toLowerCase();
    const cat   = (item.dataset.cat  || '').toLowerCase();

    const matchesSearch = query === '' || title.includes(query);
    const matchesCat    = activeCategory === 'all' || cat === activeCategory;

    if (matchesSearch && matchesCat) {
      item.style.display = '';
      visible++;
    } else {
      item.style.display = 'none';
    }
  });

  // Update result count
  const countEl = document.getElementById('resultCount');
  if (countEl) countEl.textContent = visible;

  // Show/hide empty state
  const noResults = document.getElementById('noResults');
  if (noResults) {
    noResults.classList.toggle('show', visible === 0);
  }
}

/** On page load: check for ?q= param from navbar search */
document.addEventListener('DOMContentLoaded', function () {
  const params = new URLSearchParams(window.location.search);
  const q = params.get('q');
  const searchInput = document.getElementById('articleSearch');
  const navInput    = document.getElementById('navSearch');

  if (q && searchInput) {
    searchInput.value = q;
    if (navInput) navInput.value = q;
    filterArticles();
  }
});
