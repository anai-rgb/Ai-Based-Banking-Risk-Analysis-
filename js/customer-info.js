/* ============================================================
   AEGIS BANK — Customer Portal "Info Modal" content registry.
   Mirrors js/modal.js's AegisInfo pattern but scoped to the
   logged-in customer, so every sidebar link / quick action
   shows real numbers instead of being a dead "#" link.
   ============================================================ */
const AegisCustomerInfo = {
  fmtINR: n => "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 }),
  fmtNum: n => Number(n).toLocaleString("en-IN"),
  fmtDate: d => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),

  show(key) {
    const session = AegisAuth.getSession();
    const C = session ? CUSTOMERS.find(c => c.customer_id === session.customer_id) : null;
    if (!C) return;
    const fmtINR = this.fmtINR, fmtNum = this.fmtNum, fmtDate = this.fmtDate;
    const CTx = (typeof DB !== "undefined" ? DB.txForCustomer(C.customer_id) : []).slice()
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

    const icons = {
      account: `<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/>`,
      tx: `<path d="M7 7h10M7 12h10M7 17h6"/>`,
      dispute: `<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>`,
      track: `<path d="M12 2v20M2 12h20"/>`,
      profile: `<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>`,
      bell: `<path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/>`,
      shield: `<path d="M12 2l8 3v6c0 5-3.4 8.8-8 11-4.6-2.2-8-6-8-11V5l8-3z"/>`,
      help: `<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 015 0c0 1.5-2 2-2 3.5M12 17h.01"/>`,
      transfer: `<path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/>`,
      download: `<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/>`,
      block: `<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/>`,
    };

    let title = "", body = "", icon = "icon-violet", svg = icons.account;

    switch (key) {
      case "accounts": {
        title = "My Accounts"; svg = icons.account; icon = "icon-violet";
        body = `
          <div class="mstat-grid">
            <div class="mstat"><b>${fmtINR(C.balance)}</b><span>Available balance</span></div>
            <div class="mstat"><b>${C.account_type}</b><span>Account type</span></div>
          </div>
          <ul class="mlist">
            <li><span>Account number</span><b>${C.account_number_masked}</b></li>
            <li><span>Account ID</span><b>${C.account_id}</b></li>
            <li><span>Status</span><b>${C.customer_status}</b></li>
            <li><span>KYC status</span><b>${C.kyc_status}</b></li>
            <li><span>Opened on</span><b>${fmtDate(C.account_opened_date)}</b></li>
          </ul>
          <div class="modal-note">Only one account is on file for this customer in the uploaded dataset. Multi-account support (Savings + Current + Salary) is on the roadmap.</div>`;
        break;
      }
      case "transactions": {
        title = "Transaction History"; svg = icons.tx; icon = "icon-green";
        const rows = CTx;
        body = `
          <div class="mstat-grid">
            <div class="mstat"><b>${fmtNum(C.total_transactions)}</b><span>Total (all time)</span></div>
            <div class="mstat"><b>${C.monthly_transactions}</b><span>This month</span></div>
          </div>
          <ul class="mlist">
            ${rows.length ? rows.slice(0, 8).map(t => `<li><span>${fmtDate(t.date)} · ${t.type}</span><b>${fmtINR(t.amount)}</b></li>`).join("") : `<li><span>No transactions on record</span></li>`}
          </ul>
          <div class="modal-note">Showing up to 8 of this customer's last ${rows.length} transactions on record.</div>`;
        break;
      }
      case "disputes": {
        title = "My Disputes"; svg = icons.dispute; icon = "icon-amber";
        body = `
          <div class="mstat-grid">
            <div class="mstat"><b>${C.total_disputes}</b><span>Total filed</span></div>
            <div class="mstat"><b>${C.open_disputes}</b><span>Currently open</span></div>
          </div>
          <ul class="mlist">
            <li><span>Resolved</span><b>${C.resolved_disputes}</b></li>
            <li><span>Open / under review</span><b>${C.open_disputes}</b></li>
          </ul>
          ${C.total_disputes === 0 ? `<div class="modal-note">No disputes on file for this account — nothing to track right now.</div>` : `<div class="modal-note">A dedicated case-by-case dispute tracker (with evidence upload and AI investigation timeline) is on the roadmap — see the "My Disputes" table on your dashboard for the latest cases.</div>`}`;
        break;
      }
      case "tracking": {
        title = "Dispute Tracking"; svg = icons.track; icon = "icon-violet";
        body = `<p>Once a dispute is filed, it moves through: <b>Submitted → AI Investigation → Bank Review → Resolution</b>.</p>
          <ul class="mlist">
            <li><span>Open disputes right now</span><b>${C.open_disputes}</b></li>
            <li><span>Resolved to date</span><b>${C.resolved_disputes}</b></li>
          </ul>
          <div class="modal-note">A live step-by-step timeline per case isn't wired up in this demo yet.</div>`;
        break;
      }
      case "profile": {
        title = "Profile & Settings"; svg = icons.profile; icon = "icon-blue";
        body = `
          <ul class="mlist">
            <li><span>Full name</span><b>${C.full_name}</b></li>
            <li><span>Customer ID</span><b>${C.customer_id}</b></li>
            <li><span>Email</span><b>${C.email}</b></li>
            <li><span>Mobile</span><b>${C.mobile}</b></li>
            <li><span>City / State</span><b>${C.city}, ${C.state}</b></li>
            <li><span>Occupation</span><b>${C.occupation}</b></li>
          </ul>
          <div class="modal-note">Editable profile settings (password change, address update) aren't wired up in this read-only demo.</div>`;
        break;
      }
      case "notifications": {
        title = "Notifications"; svg = icons.bell; icon = "icon-amber";
        const items = [];
        if (C.open_disputes > 0) items.push(`Your dispute is <b>under review</b> — ${C.open_disputes} case(s) open.`);
        const last = CTx[0];
        if (last && (last.is_new_device || last.location_mismatch || last.is_new_beneficiary)) {
          items.push(`Security check on your ${fmtDate(last.date)} transaction of ${fmtINR(last.amount)}.`);
        }
        items.push(`Welcome to Aegis Bank — your account was verified on ${fmtDate(C.account_opened_date)}.`);
        body = `<ul class="mlist">${items.map(i => `<li><span>${i}</span></li>`).join("")}</ul>
          <div class="modal-note">This is a live summary generated from your account data, not a persisted notification feed.</div>`;
        break;
      }
      case "security": {
        title = "Security Center"; svg = icons.shield; icon = "icon-green";
        const last = CTx[0];
        const flags = [];
        if (last && last.is_new_device) flags.push("New device login detected");
        if (last && last.location_mismatch) flags.push("Location mismatch on last transaction");
        if (last && last.is_new_beneficiary) flags.push("Payment to a new beneficiary");
        if (last && last.is_unusual_time) flags.push("Transaction at an unusual hour");
        body = `
          <div class="mstat-grid">
            <div class="mstat"><b>${C.risk_level}</b><span>Account risk level</span></div>
            <div class="mstat"><b>${C.risk_score}/100</b><span>Risk score</span></div>
          </div>
          ${flags.length ? `<ul class="mlist">${flags.map(f => `<li><span>${f}</span></li>`).join("")}</ul>` : `<p>No suspicious activity found on your most recent transaction.</p>`}
          <div class="modal-note">Never share your OTP, PIN, or password — Aegis Bank will never ask for it.</div>`;
        break;
      }
      case "help": {
        title = "Help & Support"; svg = icons.help; icon = "icon-violet";
        body = `<p>Need a hand? Reach the support desk for account, transaction, or dispute questions.</p>
          <ul class="mlist">
            <li><span>Support email</span><b>support@aegisbank.demo</b></li>
            <li><span>Helpline</span><b>1800-123-4567</b></li>
          </ul>
          <div class="modal-note">This demo doesn't send real messages — contact details are illustrative.</div>`;
        break;
      }
      case "transfer": {
        title = "Fund Transfer"; svg = icons.transfer; icon = "icon-violet";
        body = `<p>You have <b>${fmtINR(C.balance)}</b> available in your ${C.account_type} account (${C.account_number_masked}).</p>
          <div class="modal-note">Fund transfer isn't wired to a real ledger in this demo.</div>`;
        break;
      }
      case "statement": {
        title = "Download Statement"; svg = icons.download; icon = "icon-green";
        body = `<p>Would generate a PDF/CSV statement covering ${CTx.length} recent transactions on ${C.account_number_masked}.</p>
          <div class="modal-note">File export isn't wired up in this demo.</div>`;
        break;
      }
      case "block": {
        title = "Block Card"; svg = icons.block; icon = "icon-blue";
        body = `<p>Would immediately freeze card access on account <b>${C.account_number_masked}</b>.</p>
          <div class="modal-note">This demo doesn't change account state — connect this to your backend's account-status endpoint.</div>`;
        break;
      }
      default: {
        title = "Coming soon"; body = `<p>This screen isn't built yet in the demo.</p>`;
      }
    }

    window.AegisModal.open(title, body, svg, icon);
  }
};
