// session.js
// Small helper to clear the application's session data (localStorage keys and sessionStorage)
function clearAppSession() {
  const removed = [];
  try {
    // Remove all localStorage keys that start with 'att-'
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith('att-')) {
        removed.push(key);
        localStorage.removeItem(key);
      }
    }

    // Also clear sessionStorage (app uses localStorage primarily but clear sessionStorage for completeness)
    try { sessionStorage.clear(); } catch (e) { /* ignore */ }
  } catch (e) {
    // If storage is unavailable (e.g., in some privacy modes), swallow errors - best-effort only
  }

  return removed;
}

// Expose utility in browser and CommonJS environments so tests can access it
if (typeof window !== 'undefined') window.clearAppSession = clearAppSession;
if (typeof module !== 'undefined' && module.exports) module.exports = { clearAppSession };
