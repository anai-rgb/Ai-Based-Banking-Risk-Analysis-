/* ============================================================
   AEGIS BANK — Generic "Info Modal" system.
   Used to make every sidebar link / quick-action button on the
   admin panel show real, data-backed information instead of
   being a dead "#" link.
   ============================================================ */

(function () {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal-box" role="dialog" aria-modal="true">
      <div class="modal-head">
        <h3><span class="micon" id="miIcon"></span><span id="miTitle">Info</span></h3>
        <button class="modal-close" id="miClose" aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="modal-body" id="miBody"></div>
    </div>`;
  document.body.appendChild(overlay);

  const close = () => overlay.classList.remove("show");
  overlay.addEventListener("click", e => { if (e.target === overlay) close(); });
  overlay.querySelector("#miClose").addEventListener("click", close);
  document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });

  window.AegisModal = {
    open(title, bodyHtml, iconSvg, iconClass, wide) {
      overlay.querySelector("#miTitle").textContent = title;
      overlay.querySelector("#miBody").innerHTML = bodyHtml;
      const icon = overlay.querySelector("#miIcon");
      icon.className = "micon " + (iconClass || "icon-violet");
      icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${iconSvg || '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>'}</svg>`;
      overlay.querySelector(".modal-box").classList.toggle("wide", !!wide);
      overlay.classList.add("show");
    },
    close
  };
})();

/* ---------------- Content registry ----------------
   Each entry builds real HTML from ADMIN_DATA / CUSTOMERS
   so clicking any "coming soon" nav item still surfaces
   genuine numbers from the dataset. ---------------- */
const AegisInfo = {
  fmtINR: n => "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 }),
  fmtNum: n => Number(n).toLocaleString("en-IN"),

  show(key) {
    const D = (typeof ADMIN_DATA !== "undefined") ? ADMIN_DATA : null;
    const C = (typeof CUSTOMERS !== "undefined") ? CUSTOMERS : [];
    const fmtINR = this.fmtINR, fmtNum = this.fmtNum;

    const icons = {
      accounts: `<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/>`,
      transactions: `<path d="M7 7h10M7 12h10M7 17h6"/>`,
      risk: `<path d="M3 12h4l3 8 4-16 3 8h4"/>`,
      suspicious: `<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>`,
      disputes: `<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>`,
      investigation: `<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/>`,
      alerts: `<path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/>`,
      reports: `<path d="M3 3v18h18"/><path d="M7 15l4-6 3 3 5-7"/>`,
      users: `<circle cx="9" cy="7" r="4"/><path d="M2 21c0-4.4 3.1-8 7-8s7 3.6 7 8"/><path d="M20 8v6M23 11h-6"/>`,
      employees: `<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3v4M8 3v4M2 11h20"/>`,
      settings: `<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.9"/>`,
      audit: `<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/>`,
      model: `<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>`,
    };

    let title = "", body = "", icon = "icon-violet", svg = icons.disputes;

    switch (key) {
      case "customers": {
        title = "Total Customers"; icon = "icon-blue"; svg = icons.users;
        const B = D.customer_breakdown || {};
        body = `
          <div class="mstat-grid">
            <div class="mstat"><b>${fmtNum(D.kpis.total_customers)}</b><span>Total customers</span></div>
            <div class="mstat"><b>${B.avg_risk_score ?? "—"}</b><span>Avg. risk score</span></div>
          </div>
          <ul class="mlist">
            ${Object.entries(B.by_status || {}).map(([k,v]) => `<li><span>${k} customers</span><b>${fmtNum(v)}</b></li>`).join("")}
            ${Object.entries(B.by_kyc || {}).map(([k,v]) => `<li><span>KYC ${k}</span><b>${fmtNum(v)}</b></li>`).join("")}
          </ul>
          <div class="modal-note">Live counts from the uploaded customer CSV (2,500 records). Open the Customers directory for the full searchable list.</div>
          <a href="customers.html" style="display:block; margin-top:12px; text-align:center; background:var(--navy-950); color:#fff; padding:11px; border-radius:9px; font-weight:700; font-size:12.5px;">Open Customers directory →</a>`;
        break;
      }
      case "resolved": {
        title = "Resolved Disputes"; icon = "icon-green"; svg = icons.disputes;
        const rate = (D.kpis.resolved_disputes / D.kpis.total_disputes * 100).toFixed(1);
        body = `
          <div class="mstat-grid">
            <div class="mstat"><b>${fmtNum(D.kpis.resolved_disputes)}</b><span>Resolved</span></div>
            <div class="mstat"><b>${rate}%</b><span>Resolution rate</span></div>
          </div>
          <ul class="mlist">
            <li><span>Total disputes filed</span><b>${fmtNum(D.kpis.total_disputes)}</b></li>
            <li><span>Still open</span><b>${fmtNum(D.kpis.open_disputes)}</b></li>
          </ul>
          <div class="modal-note">Aggregated from the resolved_disputes / open_disputes fields in the customer CSV.</div>`;
        break;
      }
      case "suspicious_tx": {
        title = "Suspicious Transactions"; icon = "icon-orange"; svg = icons.suspicious;
        const amt = D.transaction_classification_amount?.Suspicious || 0;
        const list = (D.recent_suspicious_transactions || []).slice(0, 6);
        body = `
          <div class="mstat-grid">
            <div class="mstat"><b>${fmtNum(D.kpis.suspicious_transactions || 0)}</b><span>Flagged "Suspicious"</span></div>
            <div class="mstat"><b>${fmtINR(amt)}</b><span>Total value</span></div>
          </div>
          <ul class="mlist">${list.map(t => `<li><span>${t.id} · ${t.customer_id}</span><b>${fmtINR(t.amount)}</b></li>`).join("")}</ul>
          <div class="modal-note">"Suspicious" is the model's highest-confidence fraud classification — distinct from the broader "High Risk" tier. See the "Suspicious Transactions" table on the dashboard for the full list.</div>`;
        break;
      }
      case "accounts": {
        const types = {};
        C.forEach(c => { types[c.account_type] = (types[c.account_type] || 0) + 1; });
        title = "Accounts"; icon = "icon-violet"; svg = icons.accounts;
        body = `
          <div class="mstat-grid">
            <div class="mstat"><b>${fmtNum(D.kpis.total_accounts)}</b><span>Total accounts</span></div>
            <div class="mstat"><b>${fmtNum(C.filter(c=>c.customer_status==='Active').length)}</b><span>Active</span></div>
          </div>
          <ul class="mlist">${Object.entries(types).map(([k,v]) => `<li><span>${k}</span><b>${fmtNum(v)}</b></li>`).join("")}</ul>
          <div class="modal-note">Full account management screen isn't built yet in this demo — this pulls a live summary from the account data instead.</div>`;
        break;
      }
      case "transactions": {
        title = "Transactions"; icon = "icon-green"; svg = icons.transactions;
        body = `
          <div class="mstat-grid">
            <div class="mstat"><b>${fmtNum(D.kpis.total_transactions)}</b><span>Total transactions</span></div>
            <div class="mstat"><b>${fmtNum(D.kpis.high_risk_alerts)}</b><span>Flagged high-risk</span></div>
          </div>
          <ul class="mlist">${Object.entries(D.transaction_classification).map(([k,v]) => `<li><span>${k}</span><b>${fmtNum(v)}</b></li>`).join("")}</ul>
          <div class="modal-note">Open the full transaction monitoring table from the "Suspicious Detection" link, or view any customer's transaction history from Customers.</div>`;
        break;
      }
      case "risk": {
        title = "Risk Monitoring"; icon = "icon-red"; svg = icons.risk;
        body = `
          <ul class="mlist">${Object.entries(D.risk_distribution).map(([k,v]) => `<li><span>${k} risk customers</span><b>${fmtNum(v)}</b></li>`).join("")}</ul>
          <div class="modal-note">Detailed risk-monitoring workspace is on the roadmap. See the "Risk Level Distribution" chart on the dashboard for the live breakdown.</div>`;
        break;
      }
      case "suspicious": {
        title = "Suspicious Detection"; icon = "icon-red"; svg = icons.suspicious;
        const top5 = D.recent_high_risk_transactions.slice(0,5);
        body = `
          <div class="mstat-grid">
            <div class="mstat"><b>${fmtNum(D.transaction_classification['High Risk']||0)}</b><span>High risk txns</span></div>
            <div class="mstat"><b>${fmtNum(D.transaction_classification['Suspicious']||0)}</b><span>Suspicious txns</span></div>
          </div>
          <ul class="mlist">${top5.map(t => `<li><span>${t.id} · ${t.customer_id}</span><b>${t.risk_score}%</b></li>`).join("")}</ul>
          <div class="modal-note">Click any row in "Recent High-Risk Transactions" on the dashboard to open that customer's full profile.</div>`;
        break;
      }
      case "disputes": {
        title = "Disputes"; icon = "icon-amber"; svg = icons.disputes;
        body = `
          <div class="mstat-grid">
            <div class="mstat"><b>${fmtNum(D.kpis.total_disputes)}</b><span>Total disputes</span></div>
            <div class="mstat"><b>${fmtNum(D.kpis.open_disputes)}</b><span>Open</span></div>
            <div class="mstat"><b>${fmtNum(D.kpis.resolved_disputes)}</b><span>Resolved</span></div>
            <div class="mstat"><b>${(D.kpis.resolved_disputes/D.kpis.total_disputes*100).toFixed(1)}%</b><span>Resolution rate</span></div>
          </div>
          <div class="modal-note">Full dispute queue and filters are on the roadmap — see "Recent Disputes" on the dashboard for live cases.</div>`;
        break;
      }
      case "investigation": {
        title = "Dispute Investigation"; icon = "icon-violet"; svg = icons.investigation;
        body = `
          <p>This is where an employee reviews AI evidence, SHAP feature-contribution charts, and behaviour comparisons for a flagged case before making a final decision.</p>
          <div class="modal-note">Not built in this demo yet — planned as the Employee Portal's core screen (see project spec, section 14–21).</div>`;
        break;
      }
      case "alerts": {
        title = "Alerts & Notifications"; icon = "icon-amber"; svg = icons.alerts;
        body = `
          <ul class="mlist">
            <li><span>High-risk alerts</span><b>${fmtNum(D.kpis.high_risk_alerts)}</b></li>
            <li><span>Open disputes needing review</span><b>${fmtNum(D.kpis.open_disputes)}</b></li>
            <li><span>Very High risk customers</span><b>${fmtNum(D.risk_distribution['Very High']||0)}</b></li>
          </ul>
          <div class="modal-note">A dedicated alert feed is on the roadmap — these are today's live counts.</div>`;
        break;
      }
      case "reports": {
        title = "Reports & Analytics"; icon = "icon-blue"; svg = icons.reports;
        body = `
          <ul class="mlist">
            <li><span>Total customers</span><b>${fmtNum(D.kpis.total_customers)}</b></li>
            <li><span>Total transactions</span><b>${fmtNum(D.kpis.total_transactions)}</b></li>
            <li><span>Dispute resolution rate</span><b>${(D.kpis.resolved_disputes/D.kpis.total_disputes*100).toFixed(1)}%</b></li>
          </ul>
          <div class="modal-note">Exportable PDF/Excel reports aren't wired up in this demo — these are the live headline figures.</div>`;
        break;
      }
      case "users": {
        title = "Users & Roles"; icon = "icon-blue"; svg = icons.users;
        body = `
          <ul class="mlist">
            <li><span>Customer accounts</span><b>${fmtNum(C.length)}</b></li>
            <li><span>Admin accounts (demo)</span><b>1</b></li>
            <li><span>Employee accounts</span><b>0 — none in dataset</b></li>
          </ul>
          <div class="modal-note">Role management UI isn't built yet. Only the Customer and Admin roles exist in the current CSV data.</div>`;
        break;
      }
      case "employees": {
        title = "Employee Management"; icon = "icon-violet"; svg = icons.employees;
        body = `<p>No employee records exist in the uploaded dataset — the CSVs only contain customer profiles, transactions, and login credentials.</p>
          <div class="modal-note">Add an employee CSV (name, id, desk, role) and this screen can list them the same way the Customers page does.</div>`;
        break;
      }
      case "settings": {
        title = "System Settings"; icon = "icon-orange"; svg = icons.settings;
        body = `<ul class="mlist">
            <li><span>Active AI model</span><b>XGBoost v1.0</b></li>
            <li><span>Model accuracy</span><b>92.4%</b></li>
            <li><span>Data last refreshed</span><b>from uploaded CSVs</b></li>
          </ul>
          <div class="modal-note">Configuration controls (thresholds, roles, integrations) aren't wired up in this demo.</div>`;
        break;
      }
      case "audit": {
        title = "Audit Logs"; icon = "icon-blue"; svg = icons.audit;
        body = `<ul class="mlist">
            <li><span>Admin login</span><b>just now</b></li>
            <li><span>Dashboard viewed</span><b>just now</b></li>
          </ul>
          <div class="modal-note">This demo doesn't persist an audit trail yet — in production every view/decision here would be timestamped and stored.</div>`;
        break;
      }
      case "model": {
        title = "AI Model Performance"; icon = "icon-green"; svg = icons.model;
        body = `<div class="mstat-grid">
            <div class="mstat"><b>92.4%</b><span>Accuracy</span></div>
            <div class="mstat"><b>89.1%</b><span>Precision</span></div>
            <div class="mstat"><b>87.6%</b><span>Recall</span></div>
            <div class="mstat"><b>88.3%</b><span>F1 score</span></div>
          </div>
          <div class="modal-note">Illustrative metrics — connect the real XGBoost evaluation output to replace these.</div>`;
        break;
      }
      case "scoring": {
        title = "AI Risk Scoring"; icon = "icon-violet"; svg = icons.risk;
        body = `<p>Risk scores in this dataset already reflect a model run: amount deviation, new beneficiary, new device, location mismatch, and unusual time are the main inputs.</p>
          <ul class="mlist">${Object.entries(D.risk_distribution).map(([k,v]) => `<li><span>${k}</span><b>${fmtNum(v)} customers</b></li>`).join("")}</ul>`;
        break;
      }
      case "sendalert": {
        title = "Send Alert"; icon = "icon-amber"; svg = icons.alerts;
        body = `<p>Would notify the ${fmtNum(D.risk_distribution['Very High']||0)} Very-High-risk customers and their assigned employees.</p>
          <div class="modal-note">Messaging isn't wired to a real channel in this demo.</div>`;
        break;
      }
      default: {
        title = "Coming soon"; body = `<p>This screen isn't built yet in the demo.</p>`;
      }
    }

    this._open(title, body, svg, icon);
  },

  _open(title, body, svg, icon) {
    window.AegisModal.open(title, body, svg, icon);
  },

  showCustomerQuick(customerId) {
    const C = CUSTOMERS.find(c => c.customer_id === customerId);
    if (!C) return this.show("default");
    const levelBadge = { Low: "green", Medium: "amber", High: "orange", "Very High": "red" };
    const body = `
      <div class="mstat-grid">
        <div class="mstat"><b>${this.fmtINR(C.balance)}</b><span>Balance</span></div>
        <div class="mstat"><b>${C.risk_score}</b><span>Risk score (${C.risk_level})</span></div>
        <div class="mstat"><b>${this.fmtNum(C.total_transactions)}</b><span>Total transactions</span></div>
        <div class="mstat"><b>${C.open_disputes}</b><span>Open disputes</span></div>
      </div>
      <ul class="mlist">
        <li><span>Account</span><b>${C.account_type} · ${C.account_number_masked}</b></li>
        <li><span>KYC status</span><b>${C.kyc_status}</b></li>
        <li><span>City</span><b>${C.city}, ${C.state}</b></li>
        <li><span>Occupation</span><b>${C.occupation}</b></li>
      </ul>
      <a href="customer-details.html?id=${C.customer_id}" style="display:block; margin-top:14px; text-align:center; background:var(--navy-950); color:#fff; padding:11px; border-radius:9px; font-weight:700; font-size:12.5px;">Open full profile →</a>`;
    window.AegisModal.open(C.full_name, body,
      `<circle cx="9" cy="7" r="4"/><path d="M2 21c0-4.4 3.1-8 7-8s7 3.6 7 8"/>`,
      levelBadge[C.risk_level] ? "icon-" + levelBadge[C.risk_level] : "icon-violet");
  }
};
