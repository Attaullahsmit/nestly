// ============================================================
// NESTLY PARENTING — dashboard.js
// Pulls feeding log count for the homepage stat (if present)
// ============================================================

document.addEventListener('DOMContentLoaded', function () {
  const countEl = document.getElementById('feedingCount');
  if (!countEl) return;

  try {
    const raw = localStorage.getItem('feedingLogs');
    const logs = raw ? JSON.parse(raw) : [];
    countEl.textContent = Array.isArray(logs) ? logs.length : 0;
  } catch (err) {
    console.error('Could not read feeding logs for dashboard count:', err);
    countEl.textContent = 0;
  }
});
