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
 * Guest Comments — shared, parameterized implementation.
 *
 * Added for the sitewide Guest Comments rollout (Family-A pages only;
 * Families B/C/D/F keep their own local per-article scripts since their
 * CSS/visual system differs and isn't unified here).
 *
 * Each page calls this once, after DOMContentLoaded, with its own
 * article-specific values:
 *
 *   document.addEventListener('DOMContentLoaded', function () {
 *     initGuestComments({
 *       postPath: '/about.html',
 *       jsonPath: '/comments/about.json'
 *     });
 *   });
 *
 * Nothing here is article-specific — postPath and jsonPath are the only
 * per-page inputs. If the expected DOM elements aren't present on a page,
 * this exits harmlessly rather than throwing (defensive guard, since
 * main.js loads on every page, not just ones with Guest Comments).
 */
function initGuestComments(config) {
  var tabGithub = document.getElementById('tab-github');
  var tabNetlify = document.getElementById('tab-netlify');
  var panelGithub = document.getElementById('panel-github');
  var panelNetlify = document.getElementById('panel-netlify');
  var hintGithub = document.getElementById('hint-github');
  var hintNetlify = document.getElementById('hint-netlify');

  if (!tabGithub || !tabNetlify || !panelGithub || !panelNetlify) {
    return; // this page doesn't have the Guest Comments markup — nothing to do
  }

  function activateTab(tab, otherTab, panel, otherPanel, hint, otherHint) {
    tab.setAttribute('aria-selected', 'true');
    tab.tabIndex = 0;
    otherTab.setAttribute('aria-selected', 'false');
    otherTab.tabIndex = -1;
    panel.hidden = false;
    otherPanel.hidden = true;
    hint.hidden = false;
    otherHint.hidden = true;
  }

  tabGithub.addEventListener('click', function () {
    activateTab(tabGithub, tabNetlify, panelGithub, panelNetlify, hintGithub, hintNetlify);
  });
  tabNetlify.addEventListener('click', function () {
    activateTab(tabNetlify, tabGithub, panelNetlify, panelGithub, hintNetlify, hintGithub);
  });

  [tabGithub, tabNetlify].forEach(function (tab, i) {
    tab.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        var target = (i === 0 ? tabNetlify : tabGithub);
        target.focus();
        target.click();
      }
    });
  });

  var form = document.getElementById('netlifyCommentForm');
  var submitBtn = document.getElementById('netlifySubmitBtn');
  var consentCheckbox = document.getElementById('commentConsent');
  var contactFields = document.getElementById('contactFields');
  var emailInput = document.getElementById('commentEmail');
  var whatsappInput = document.getElementById('commentWhatsapp');

  // Progressive disclosure for private contact fields. Consent starts
  // unchecked (required — pre-ticked consent is invalid under UK/EU GDPR
  // and violates WhatsApp's own Business Messaging Policy). Email/WhatsApp
  // inputs are `disabled` while hidden so the browser's FormData never
  // includes them unless the visitor actively opts in.
  if (consentCheckbox) {
    consentCheckbox.addEventListener('change', function () {
      var isChecked = consentCheckbox.checked;
      contactFields.hidden = !isChecked;
      emailInput.disabled = !isChecked;
      whatsappInput.disabled = !isChecked;
      if (!isChecked) {
        emailInput.value = '';
        whatsappInput.value = '';
      }
    });
  }

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      submitBtn.disabled = true;
      var successEl = document.getElementById('netlifyFormSuccess');
      var errorEl = document.getElementById('netlifyFormError');
      successEl.hidden = true;
      errorEl.hidden = true;

      fetch(config.postPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(new FormData(form)).toString()
      })
        .then(function (res) {
          if (res.ok) {
            successEl.hidden = false;
            form.reset();
            contactFields.hidden = true;
            emailInput.disabled = true;
            whatsappInput.disabled = true;
          } else {
            errorEl.hidden = false;
          }
        })
        .catch(function () {
          errorEl.hidden = false;
        })
        .finally(function () {
          submitBtn.disabled = false;
        });
    });
  }

  // Approved comments — fetched only from the static JSON file for this
  // specific article. No Netlify API, no credentials, no path to
  // email/WhatsApp/role/consent ever reaching this function.
  function formatCommentDate(iso) {
    try {
      var d = new Date(iso);
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (err) {
      return '';
    }
  }

  function renderApprovedComments(list) {
    var container = document.getElementById('approvedComments');
    if (!container) return;
    container.textContent = ''; // clear without ever touching innerHTML

    if (!list || list.length === 0) {
      var empty = document.createElement('p');
      empty.className = 'netlify-comment-empty';
      empty.textContent = 'No comments yet — be the first to share your experience.';
      container.appendChild(empty);
      return;
    }

    list.forEach(function (c) {
      var item = document.createElement('div');
      item.className = 'netlify-comment-item';

      var nameEl = document.createElement('strong');
      nameEl.textContent = c.name; // textContent only — never innerHTML for submitted data

      var dateEl = document.createElement('span');
      dateEl.className = 'netlify-comment-date';
      dateEl.textContent = formatCommentDate(c.submittedAt);

      var textEl = document.createElement('p');
      textEl.textContent = c.text;

      item.appendChild(nameEl);
      item.appendChild(dateEl);
      item.appendChild(textEl);
      container.appendChild(item);
    });
  }

  tabNetlify.addEventListener('click', function fetchOnce() {
    fetch(config.jsonPath)
      .then(function (res) { return res.ok ? res.json() : []; })
      .then(renderApprovedComments)
      .catch(function () { renderApprovedComments([]); });
    tabNetlify.removeEventListener('click', fetchOnce);
  });
}
