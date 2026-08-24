/* ============================================================
   AEGIS BANK — Audit Log
   Records REAL actions performed in this browser session
   (logins, page views, decisions clicked) to localStorage.
   This is not fabricated data — every row here corresponds to
   something that actually happened in the app.
   ============================================================ */
const AuditLog = (function () {
  const KEY = "aegis_audit_log";
  const MAX_ENTRIES = 500;

  function all() {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
    catch (e) { return []; }
  }

  function record(action, module, detail) {
    const session = (typeof AegisAuth !== "undefined") ? AegisAuth.getSession() : null;
    const entry = {
      id: "LOG_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      user: session ? (session.name || session.username || session.customer_id || "Unknown") : "Anonymous",
      role: session ? session.role : "—",
      action, module, detail: detail || "",
      timestamp: new Date().toISOString(),
      status: "Success"
    };
    const entries = all();
    entries.unshift(entry);
    if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES;
    try { localStorage.setItem(KEY, JSON.stringify(entries)); } catch (e) { /* storage full or unavailable */ }
    return entry;
  }

  function clear() { localStorage.removeItem(KEY); }

  return { all, record, clear };
})();
