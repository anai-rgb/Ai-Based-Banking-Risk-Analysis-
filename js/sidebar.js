/* ============================================================
   AEGIS BANK — Shared Admin Sidebar
   Renders the sidebar once from a single template so every page
   stays in sync. Call AdminSidebar.mount('accounts') etc.
   ============================================================ */
const AdminSidebar = (function () {
  const NAV_MAIN = [
    { key: "dashboard", label: "Dashboard", href: "dashboard.html", svg: `<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>` },
    { key: "customers", label: "Customers", href: "customers.html", svg: `<circle cx="9" cy="7" r="4"/><path d="M2 21c0-4.4 3.1-8 7-8s7 3.6 7 8"/><circle cx="17" cy="9" r="3"/>` },
    { key: "accounts", label: "Accounts", href: "accounts.html", svg: `<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/>` },
    { key: "loans", label: "Loan Accounts", href: "loan-accounts.html", svg: `<circle cx="12" cy="12" r="9"/><path d="M8 12h8M12 8v8"/>` },
    { key: "transactions", label: "Transactions", href: "transactions.html", svg: `<path d="M7 7h10M7 12h10M7 17h6"/>` },
    { key: "risk", label: "Risk Monitoring", href: "risk-monitoring.html", svg: `<path d="M3 12h4l3 8 4-16 3 8h4"/>` },
    { key: "suspicious", label: "Suspicious Detection", href: "suspicious-detection.html", aiTag: true, svg: `<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>` },
    { key: "disputes", label: "Disputes", href: "disputes.html", svg: `<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>` },
    { key: "investigation", label: "Dispute Investigation", href: "dispute-investigation.html", svg: `<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/>` },
    { key: "alerts", label: "Alerts & Notifications", href: "alerts.html", countKey: "alerts", svg: `<path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/>` },
    { key: "reports", label: "Reports & Analytics", href: "reports.html", svg: `<path d="M3 3v18h18"/><path d="M7 15l4-6 3 3 5-7"/>` },
  ];
  const NAV_ADMIN = [
    { key: "users", label: "Users & Roles", href: "users-roles.html", svg: `<circle cx="9" cy="7" r="4"/><path d="M2 21c0-4.4 3.1-8 7-8s7 3.6 7 8"/><path d="M20 8v6M23 11h-6"/>` },
    { key: "employees", label: "Employee Management", href: "employee-management.html", svg: `<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3v4M8 3v4M2 11h20"/>` },
    { key: "settings", label: "System Settings", href: "settings.html", svg: `<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.6 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>` },
    { key: "audit", label: "Audit Logs", href: "audit-logs.html", svg: `<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/>` },
  ];

  function itemHtml(item, activeKey) {
    const active = item.key === activeKey;
    const countBadge = item.countKey ? `<span class="count" id="navCount_${item.countKey}" style="display:none;">0</span>` : "";
    const aiBadge = item.aiTag ? `<span class="badge violet" style="margin-left:auto; padding:2px 7px; font-size:10px;">AI</span>` : "";
    return `<li><a href="${item.href}" class="${active ? "active" : ""}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${item.svg}</svg>${item.label}${countBadge}${aiBadge}
    </a></li>`;
  }

  function mount(activeKey, opts) {
    opts = opts || {};
    const target = document.getElementById("sidebarMount");
    if (!target) return;
    target.outerHTML = `
    <aside class="sidebar">
      <div class="sidebar-brand">
        <div class="shield"><svg viewBox="0 0 24 24" fill="none"><path d="M12 2l8 3v6c0 5-3.4 8.8-8 11-4.6-2.2-8-6-8-11V5l8-3z" fill="#fff"/></svg></div>
        <div class="text"><b>AEGIS BANK</b><span>Risk Intelligence</span></div>
      </div>

      <div class="nav-section-label">Main Menu</div>
      <nav><ul>${NAV_MAIN.map(i => itemHtml(i, activeKey)).join("")}</ul></nav>

      <div class="nav-section-label">Administration</div>
      <nav><ul>${NAV_ADMIN.map(i => itemHtml(i, activeKey)).join("")}</ul></nav>

      <div class="sidebar-spacer"></div>

      <div class="sidebar-callout">
        <div class="row"><span class="dot"></span><b>AI Model Status</b></div>
        <div class="val">92.4%</div>
        <div class="sub">Model accuracy · XGBoost v1.0</div>
      </div>

      <div class="sidebar-profile">
        <div class="avatar">AV</div>
        <div class="info">
          <b id="sideName">Loading…</b>
          <span><span class="dot"></span>Super Admin</span>
        </div>
        <button class="logout-btn" id="logoutBtn" aria-label="Log out" title="Log out">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>
        </button>
      </div>
    </aside>`;

    const session = AegisAuth.guard("admin", "../login.html");
    if (!session) return null;
    const nameEl = document.getElementById("sideName");
    if (nameEl) nameEl.textContent = session.name || "Admin";
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) logoutBtn.addEventListener("click", () => AegisAuth.logout("../login.html"));

    // unread alert badge
    if (typeof DB !== "undefined") {
      const badge = document.getElementById("navCount_alerts");
      if (badge) {
        const n = DB.unreadCount();
        if (n > 0) { badge.textContent = n > 999 ? "999+" : n; badge.style.display = ""; }
      }
    }
    return session;
  }

  return { mount };
})();
