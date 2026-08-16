// ============================================================
// NESTLY PARENTING — feeding-tracker.js
// Baby feeding log: add, delete (with undo), persist to localStorage
//
// Data model: each entry is an object, not a plain string, so
// entries can be sorted, grouped by day, and used to compute
// "time since last feed" — none of which was possible when
// entries were stored as formatted strings.
//   { id: string, iso: string (full ISO timestamp), type: 'breast'|'bottle'|'solid'|null }
// ============================================================

const STORAGE_KEY = 'feedingLogs';
let logs = loadLogs();
let selectedType = null;       // currently selected feeding type chip
let pendingDelete = null;      // { entry, index, timer } — supports undo
let undoTimeout = null;

/** Safe read from localStorage. Never lets a corrupted value break the page. */
function loadLogs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    // Migrate legacy plain-string entries ("Feeding at 8:30 AM") from the
    // previous data model so nobody's existing log data is lost.
    return parsed.map(migrateEntry).filter(Boolean);
  } catch (err) {
    console.error('Could not read feeding logs, starting fresh:', err);
    return [];
  }
}

function migrateEntry(entry) {
  if (entry && typeof entry === 'object' && entry.iso) return entry;
  if (typeof entry === 'string') {
    // Legacy format: "Feeding at 8:30 AM" — no reliable date, so anchor
    // it to today rather than silently discarding the user's data.
    return { id: cryptoId(), iso: new Date().toISOString(), type: null, legacyLabel: entry };
  }
  return null;
}

function cryptoId() {
  return (Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
}

/** Safe write to localStorage. */
function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch (err) {
    console.error('Could not save feeding log:', err);
    announce('Could not save — your device storage may be full.');
  }
}

/** Politely announce a message to screen readers without stealing focus. */
function announce(message) {
  const region = document.getElementById('srAnnounce');
  if (region) region.textContent = message;
}

function updateBadge() {
  const badge = document.getElementById('logBadge');
  if (badge) badge.textContent = logs.length + (logs.length === 1 ? ' entry' : ' entries');
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatRelative(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + (mins === 1 ? ' min ago' : ' mins ago');
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return hrs + 'h' + (remMins ? ' ' + remMins + 'm' : '') + ' ago';
}

function dayLabel(iso) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a, b) => a.toDateString() === b.toDateString();
  if (sameDay(d, today)) return 'Today';
  if (sameDay(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

const TYPE_META = {
  breast: { label: 'Breast', icon: '🤱' },
  bottle: { label: 'Bottle', icon: '🍼' },
  solid:  { label: 'Solid',  icon: '🥄' }
};

/** Updates the "last fed / today's total" summary above the log. */
function renderSummary() {
  const el = document.getElementById('feedSummary');
  if (!el) return;

  if (logs.length === 0) {
    el.innerHTML = '';
    el.hidden = true;
    return;
  }
  el.hidden = false;

  const sorted = [...logs].sort((a, b) => new Date(b.iso) - new Date(a.iso));
  const last = sorted[0];
  const todayCount = sorted.filter(l => dayLabel(l.iso) === 'Today').length;

  el.innerHTML = `
    <div class="summary-stat">
      <span class="summary-label">Last feed</span>
      <span class="summary-value">${escapeHtml(formatRelative(last.iso))}</span>
    </div>
    <div class="summary-divider" aria-hidden="true"></div>
    <div class="summary-stat">
      <span class="summary-label">Today</span>
      <span class="summary-value">${todayCount} ${todayCount === 1 ? 'feed' : 'feeds'}</span>
    </div>
  `;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function render() {
  const container = document.getElementById('logs');
  if (!container) return;
  container.innerHTML = '';

  if (logs.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'log-empty';
    empty.innerHTML = `<div class="e-icon" aria-hidden="true">🍼</div>`;
    const p = document.createElement('p');
    p.className = 'font-ui';
    p.textContent = 'No sessions logged yet.';
    const p2 = document.createElement('p');
    p2.className = 'font-ui';
    p2.style.marginTop = '2px';
    p2.textContent = 'Add your first entry above.';
    empty.appendChild(p);
    empty.appendChild(p2);
    container.appendChild(empty);
    updateBadge();
    renderSummary();
    renderWeeklyTrend();
    return;
  }

  const sorted = [...logs].sort((a, b) => new Date(b.iso) - new Date(a.iso));

  let lastDay = null;
  sorted.forEach(function (entry) {
    const label = dayLabel(entry.iso);
    if (label !== lastDay) {
      const heading = document.createElement('div');
      heading.className = 'log-day-heading';
      heading.textContent = label;
      container.appendChild(heading);
      lastDay = label;
    }

    const div = document.createElement('div');
    div.className = 'log-item';
    div.dataset.id = entry.id;

    const left = document.createElement('div');
    left.className = 'log-item-left';

    if (entry.type && TYPE_META[entry.type]) {
      const chip = document.createElement('span');
      chip.className = 'log-type-chip log-type-' + entry.type;
      chip.setAttribute('aria-hidden', 'true');
      chip.textContent = TYPE_META[entry.type].icon;
      left.appendChild(chip);
    }

    const textWrap = document.createElement('div');
    const timeEl = document.createElement('span');
    timeEl.className = 'log-text';
    timeEl.textContent = (entry.legacyLabel || formatTime(entry.iso));
    textWrap.appendChild(timeEl);

    if (entry.type && TYPE_META[entry.type]) {
      const typeLabel = document.createElement('span');
      typeLabel.className = 'log-type-label';
      typeLabel.textContent = TYPE_META[entry.type].label;
      textWrap.appendChild(typeLabel);
    }

    // Optional details, shown only when present — same textContent-only
    // approach used throughout this file, never innerHTML with entry data.
    const detailBits = [];
    if (entry.amount) detailBits.push(entry.amount + ' ' + entry.amountUnit);
    if (entry.duration) detailBits.push(entry.duration + ' min');
    if (entry.side) detailBits.push(entry.side.charAt(0).toUpperCase() + entry.side.slice(1));
    if (entry.note) detailBits.push(entry.note);
    if (detailBits.length) {
      const detailEl = document.createElement('span');
      detailEl.className = 'log-detail-label';
      detailEl.textContent = detailBits.join(' · ');
      textWrap.appendChild(detailEl);
    }

    left.appendChild(textWrap);
    div.appendChild(left);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-log-del';
    btn.dataset.deleteId = entry.id;
    btn.setAttribute('aria-label', 'Remove feeding logged at ' + formatTime(entry.iso));
    btn.textContent = 'Remove';
    div.appendChild(btn);

    container.appendChild(div);
  });

  updateBadge();
  renderSummary();
  renderWeeklyTrend();
}

/**
 * Weekly pattern view — passive insight only, no new input required from the
 * parent. Shows feed count per day for the last 7 days (including today).
 *
 * Accessibility: a bar chart's relative heights convey nothing to a screen
 * reader, so the visual bars are aria-hidden and a full text equivalent is
 * provided via aria-label on the container (e.g. "Monday: 6 feeds, Tuesday: 8
 * feeds..."). This follows the same evidence-based pattern used elsewhere on
 * this page (announce() for the log itself) rather than leaving chart data
 * inaccessible to screen reader users.
 */
function renderWeeklyTrend() {
  const container = document.getElementById('weeklyTrend');
  if (!container) return;

  if (logs.length === 0) {
    container.innerHTML = '';
    container.hidden = true;
    return;
  }

  // Build the last 7 calendar days (oldest to newest, today last).
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    days.push(d);
  }

  const counts = days.map(day => {
    return logs.filter(l => {
      const entryDate = new Date(l.iso);
      return entryDate.toDateString() === day.toDateString();
    }).length;
  });

  const hasAnyDataThisWeek = counts.some(c => c > 0);
  if (!hasAnyDataThisWeek) {
    container.innerHTML = '';
    container.hidden = true;
    return;
  }

  container.hidden = false;
  const maxCount = Math.max(...counts, 1);

  const dayLabels = days.map(d => d.toLocaleDateString([], { weekday: 'short' }));
  const fullDayLabels = days.map(d => d.toLocaleDateString([], { weekday: 'long' }));
  const today = new Date();

  // Full text equivalent for screen readers — the actual accessible content.
  const textSummary = fullDayLabels
    .map((label, i) => `${label}: ${counts[i]} ${counts[i] === 1 ? 'feed' : 'feeds'}`)
    .join(', ');

  container.setAttribute('role', 'img');
  container.setAttribute('aria-label', 'This week\'s feeding pattern. ' + textSummary);

  container.innerHTML = '';

  const heading = document.createElement('div');
  heading.className = 'weekly-trend-heading';
  heading.setAttribute('aria-hidden', 'true');
  heading.textContent = 'This Week';
  container.appendChild(heading);

  const barsWrap = document.createElement('div');
  barsWrap.className = 'weekly-trend-bars';
  barsWrap.setAttribute('aria-hidden', 'true'); // decorative; full data is in the container's aria-label above

  days.forEach((day, i) => {
    const col = document.createElement('div');
    col.className = 'weekly-trend-col';

    const barTrack = document.createElement('div');
    barTrack.className = 'weekly-trend-bar-track';

    const bar = document.createElement('div');
    bar.className = 'weekly-trend-bar';
    const heightPct = Math.round((counts[i] / maxCount) * 100);
    bar.style.height = Math.max(heightPct, counts[i] > 0 ? 8 : 0) + '%';
    if (day.toDateString() === today.toDateString()) {
      bar.classList.add('weekly-trend-bar-today');
    }
    barTrack.appendChild(bar);

    const count = document.createElement('div');
    count.className = 'weekly-trend-count';
    count.textContent = counts[i] > 0 ? String(counts[i]) : '';

    const label = document.createElement('div');
    label.className = 'weekly-trend-label';
    label.textContent = dayLabels[i];

    col.appendChild(count);
    col.appendChild(barTrack);
    col.appendChild(label);
    barsWrap.appendChild(col);
  });

  container.appendChild(barsWrap);
}

function addLog() {
  const input = document.getElementById('timeInput');
  if (!input || !input.value) {
    if (input) { input.focus(); announce('Please choose a feeding time first.'); }
    return;
  }

  // input type="time" gives us "HH:MM" in 24h format — combine with today's date.
  const [h, m] = input.value.split(':').map(Number);
  const iso = new Date();
  iso.setHours(h, m, 0, 0);

  const entry = { id: cryptoId(), iso: iso.toISOString(), type: selectedType };

  // Optional detail fields — only attached if the parent actually filled
  // them in. Omitting all of them keeps the original 1-tap flow intact.
  if (selectedType === 'bottle') {
    const amountInput = document.getElementById('amountInput');
    const amountUnit = document.getElementById('amountUnit');
    const amountVal = amountInput ? parseFloat(amountInput.value) : NaN;
    if (!isNaN(amountVal) && amountVal > 0) {
      entry.amount = amountVal;
      entry.amountUnit = amountUnit ? amountUnit.value : 'oz';
    }
  } else if (selectedType === 'breast') {
    const durationInput = document.getElementById('durationInput');
    const durationVal = durationInput ? parseInt(durationInput.value, 10) : NaN;
    if (!isNaN(durationVal) && durationVal > 0) {
      entry.duration = durationVal;
    }
    if (selectedSide === 'left' || selectedSide === 'right') {
      entry.side = selectedSide;
      try { localStorage.setItem(LAST_SIDE_KEY, selectedSide); } catch (err) { /* non-fatal */ }
    }
  } else if (selectedType === 'solid') {
    const noteInput = document.getElementById('noteInput');
    const noteVal = noteInput ? noteInput.value.trim() : '';
    if (noteVal) entry.note = noteVal.slice(0, 80);
  }

  logs.push(entry);
  save();
  render();
  const detailParts = [];
  if (entry.amount) detailParts.push(entry.amount + ' ' + entry.amountUnit);
  if (entry.duration) detailParts.push(entry.duration + ' min');
  if (entry.side) detailParts.push(entry.side + ' side');
  if (entry.note) detailParts.push(entry.note);
  const detailText = detailParts.length ? ', ' + detailParts.join(', ') : '';

  announce('Feeding logged at ' + formatTime(entry.iso) + (selectedType ? ', ' + TYPE_META[selectedType].label : '') + detailText + '.');

  input.value = '';
  clearTypeSelection();
}

function deleteLog(id) {
  const index = logs.findIndex(l => l.id === id);
  if (index === -1) return;

  const [removed] = logs.splice(index, 1);
  save();
  render();
  announce('Feeding entry removed.');
  showUndo(removed);
}

function showUndo(removedEntry) {
  clearTimeout(undoTimeout);
  const toast = document.getElementById('undoToast');
  if (!toast) return;
  pendingDelete = removedEntry;
  toast.hidden = false;
  toast.classList.add('show');

  undoTimeout = setTimeout(function () {
    toast.classList.remove('show');
    toast.hidden = true;
    pendingDelete = null;
  }, 5500);
}

function undoDelete() {
  if (!pendingDelete) return;
  clearTimeout(undoTimeout);
  logs.push(pendingDelete);
  save();
  render();
  announce('Feeding entry restored.');
  pendingDelete = null;
  const toast = document.getElementById('undoToast');
  if (toast) { toast.classList.remove('show'); toast.hidden = true; }
}

const LAST_SIDE_KEY = 'feedingLastSide';
let selectedSide = null;

function updateOptionalFieldsVisibility() {
  const bottleFields = document.getElementById('bottleFields');
  const breastFields = document.getElementById('breastFields');
  const solidFields = document.getElementById('solidFields');
  if (bottleFields) bottleFields.hidden = selectedType !== 'bottle';
  if (breastFields) breastFields.hidden = selectedType !== 'breast';
  if (solidFields) solidFields.hidden = selectedType !== 'solid';

  if (selectedType === 'breast') {
    suggestLastSide();
  }
}

/** Defaults the side toggle to whichever side was NOT used last time,
 *  and shows a small hint so the parent knows why it's pre-selected. */
function suggestLastSide() {
  let lastSide = null;
  try {
    lastSide = localStorage.getItem(LAST_SIDE_KEY);
  } catch (err) {
    lastSide = null;
  }
  const suggested = lastSide === 'left' ? 'right' : lastSide === 'right' ? 'left' : null;
  const hint = document.getElementById('lastSideHint');

  if (suggested) {
    setSide(suggested, /* silent */ true);
    if (hint) {
      hint.textContent = 'Last feed was ' + lastSide + ' — suggesting ' + suggested + '.';
      hint.hidden = false;
    }
  } else if (hint) {
    hint.hidden = true;
  }
}

function setSide(side, silent) {
  selectedSide = (selectedSide === side && !silent) ? null : side;
  document.querySelectorAll('.side-chip').forEach(function (chip) {
    const isActive = chip.dataset.side === selectedSide;
    chip.classList.toggle('active', isActive);
    chip.setAttribute('aria-pressed', String(isActive));
  });
}

function setType(type) {
  selectedType = (selectedType === type) ? null : type;
  document.querySelectorAll('.type-chip').forEach(function (chip) {
    const isActive = chip.dataset.type === selectedType;
    chip.classList.toggle('active', isActive);
    chip.setAttribute('aria-pressed', String(isActive));
  });
  updateOptionalFieldsVisibility();
}

function clearTypeSelection() {
  selectedType = null;
  selectedSide = null;
  document.querySelectorAll('.type-chip').forEach(function (chip) {
    chip.classList.remove('active');
    chip.setAttribute('aria-pressed', 'false');
  });
  updateOptionalFieldsVisibility();

  // Clear the optional field inputs themselves after a successful log,
  // same "leave it clean for the next entry" behavior as the time input.
  const amountInput = document.getElementById('amountInput');
  const durationInput = document.getElementById('durationInput');
  const noteInput = document.getElementById('noteInput');
  if (amountInput) amountInput.value = '';
  if (durationInput) durationInput.value = '';
  if (noteInput) noteInput.value = '';
}

function useCurrentTime() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const input = document.getElementById('timeInput');
  if (input) {
    input.value = hh + ':' + mm;
    input.focus();
  }
}

document.addEventListener('DOMContentLoaded', function () {
  const input = document.getElementById('timeInput');
  if (input) {
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') addLog();
    });
  }

  const addBtn = document.getElementById('btnAddEntry');
  if (addBtn) addBtn.addEventListener('click', addLog);

  const currentTimeBtn = document.getElementById('btnCurrentTime');
  if (currentTimeBtn) currentTimeBtn.addEventListener('click', useCurrentTime);

  document.querySelectorAll('.type-chip').forEach(function (chip) {
    chip.addEventListener('click', function () { setType(chip.dataset.type); });
  });

  document.querySelectorAll('.side-chip').forEach(function (chip) {
    chip.addEventListener('click', function () { setSide(chip.dataset.side, false); });
  });

  // Event delegation for dynamically rendered "Remove" buttons.
  const logsContainer = document.getElementById('logs');
  if (logsContainer) {
    logsContainer.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-delete-id]');
      if (btn) deleteLog(btn.dataset.deleteId);
    });
  }

  const undoBtn = document.getElementById('undoBtn');
  if (undoBtn) undoBtn.addEventListener('click', undoDelete);

  render();
});
