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
 * redirects to /articles with a pre-filled query
 *
 * Uses a root-relative path ("/articles") rather than a plain
 * relative one, because this script is shared across pages at two
 * different folder depths (site root, and /blog/). A plain relative
 * "articles" would resolve to the wrong location (blog/articles,
 * which does not exist) when triggered from any article page.
 */
function handleNavSearch(event) {
  if (event.key === 'Enter') {
    const query = document.getElementById('navSearch').value.trim();
    if (query) {
      window.location.href = '/articles?q=' + encodeURIComponent(query);
    }
  }
}

/**
 * Comments tab toggle: switches between the GitHub (Giscus) panel
 * and the Facebook Comments panel. Shared across every page that
 * has a .comments-wrapper block.
 */
function setCommentsTab(btn, tab) {
  const wrapper = btn.closest('.comments-wrapper, [data-comments-group]');
  if (!wrapper) return;

  wrapper.querySelectorAll('.comments-tab').forEach(function (b) {
    b.classList.remove('active');
    b.setAttribute('aria-selected', 'false');
  });
  btn.classList.add('active');
  btn.setAttribute('aria-selected', 'true');

  wrapper.querySelectorAll('.comments-panel').forEach(function (p) {
    p.classList.toggle('active', p.dataset.panel === tab);
  });

  // Facebook's SDK only renders .fb-comments elements that are visible
  // at page-load time (when it does its one-time DOM parse). Since the
  // Facebook panel starts hidden (it's inside an inactive tab), it never
  // gets rendered on load — so we have to explicitly ask the SDK to parse
  // it now, the moment the panel actually becomes visible.
  if (tab === 'facebook') {
    const panel = wrapper.querySelector('[data-panel="facebook"]');
    if (panel) {
      renderFacebookComments(panel);
    }
  }
}

/**
 * Asks the Facebook SDK to render any .fb-comments elements inside the
 * given panel. If the SDK script hasn't finished loading yet (slow
 * connection, tab switched very fast), retries briefly instead of
 * silently doing nothing.
 */
function renderFacebookComments(panel, attemptsLeft) {
  if (attemptsLeft === undefined) attemptsLeft = 20; // ~4 seconds total
  if (window.FB && window.FB.XFBML) {
    window.FB.XFBML.parse(panel);
  } else if (attemptsLeft > 0) {
    setTimeout(function () {
      renderFacebookComments(panel, attemptsLeft - 1);
    }, 200);
  }
}
