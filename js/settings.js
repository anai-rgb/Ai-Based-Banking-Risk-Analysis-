/* ============================================================
   AEGIS BANK — Settings Store
   Real, persisted settings (localStorage) that other pages
   actually read — not a decorative form.
   ============================================================ */
const AegisSettings = (function () {
  const KEY = "aegis_settings";
  const DEFAULTS = {
    riskThreshold: 70,          // used for the "custom flagged" preview below
    emailAlerts: true,
    highRiskAlerts: true,
    disputeAlerts: true,
    defaultReportRange: "30d",  // "all" | "today" | "7d" | "30d" | "6m"
    autoRefreshMinutes: 0,      // 0 = off
  };

  function get() {
    try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; }
    catch (e) { return { ...DEFAULTS }; }
  }
  function set(patch) {
    const next = { ...get(), ...patch };
    localStorage.setItem(KEY, JSON.stringify(next));
    return next;
  }
  function reset() {
    localStorage.removeItem(KEY);
    return { ...DEFAULTS };
  }

  return { get, set, reset, DEFAULTS };
})();
