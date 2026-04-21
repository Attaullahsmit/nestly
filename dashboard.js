// ============================================================
// NESTLY PARENTING — dashboard.js
// Pulls feeding log count for the homepage stat (if present)
// ============================================================

document.addEventListener('DOMContentLoaded', function () {
  const countEl = document.getElementById('feedingCount');
  if (countEl) {
    const logs = JSON.parse(localStorage.getItem('feedingLogs')) || [];
    countEl.textContent = logs.length;
  }
});
