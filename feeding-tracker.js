// ============================================================
// NESTLY PARENTING — feeding-tracker.js
// Baby feeding log: add, delete, persist to localStorage
// ============================================================

let logs = JSON.parse(localStorage.getItem('feedingLogs')) || [];

function save() {
  localStorage.setItem('feedingLogs', JSON.stringify(logs));
}

function updateBadge() {
  const badge = document.getElementById('logBadge');
  if (badge) badge.textContent = logs.length + (logs.length === 1 ? ' entry' : ' entries');
}

function render() {
  const container = document.getElementById('logs');
  if (!container) return;
  container.innerHTML = '';

  if (logs.length === 0) {
    container.innerHTML = `
      <div class="log-empty">
        <div class="e-icon">🍼</div>
        <p class="font-ui">No sessions logged yet.<br>Add your first entry above!</p>
      </div>`;
    updateBadge();
    return;
  }

  logs.forEach(function (log, i) {
    const div = document.createElement('div');
    div.className = 'log-item';
    div.innerHTML = `
      <div class="d-flex align-items-center">
        <div class="log-index">${i + 1}</div>
        <span class="log-text">${log}</span>
      </div>
      <button class="btn-log-del" onclick="del(${i})">Remove</button>
    `;
    container.appendChild(div);
  });

  updateBadge();
}

function addLog() {
  const input = document.getElementById('timeInput');
  const val = input.value.trim();
  if (!val) { input.focus(); return; }
  logs.unshift('Feeding at ' + val);
  save();
  render();
  input.value = '';
}

function del(i) {
  logs.splice(i, 1);
  save();
  render();
}

function useCurrentTime() {
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const input = document.getElementById('timeInput');
  input.value = now;
  input.focus();
}

// Enter key support
document.addEventListener('DOMContentLoaded', function () {
  const input = document.getElementById('timeInput');
  if (input) {
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') addLog();
    });
  }
  render();
});