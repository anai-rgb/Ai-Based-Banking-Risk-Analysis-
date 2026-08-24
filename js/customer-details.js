/* ============================================================
   AEGIS BANK — Customer Detail (Admin) render logic
   Pulls the customer profile from DB.customers and the FULL
   transaction history from DB.txForCustomer() — not capped at 10.
   ============================================================ */
(function () {
  const session = AdminSidebar.mount("customers");
  if (!session) return;

  const fmtINR = n => "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });
  const fmtNum = n => Number(n).toLocaleString("en-IN");
  const fmtDate = d => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const initials = name => name.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const customer = DB.custById.get(id);
  const main = document.getElementById("mainContent");

  if (!customer) {
    main.innerHTML = `
      <div class="panel" style="text-align:center; padding:60px 20px;">
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:block;margin:0 auto 12px;"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
          <h3 style="margin-bottom:6px;">Customer not found</h3>
          <p>No customer matches the ID <b>${id || "(none supplied)"}</b> in the dataset.</p>
          <a href="customers.html" style="display:inline-block; margin-top:16px; background:var(--navy-950); color:#fff; padding:10px 18px; border-radius:9px; font-weight:700; font-size:12.5px; text-decoration:none;">&larr; Back to customer directory</a>
        </div>
      </div>`;
    return;
  }

  AuditLog.record("View", "Customer Profile", `${customer.customer_id} — ${customer.full_name}`);
  document.title = `Aegis Bank · ${customer.full_name}`;

  const levelBadge = { Low: "green", Medium: "amber", High: "orange", "Very High": "red" };
  const statusBadgeMap = { Active: "green", Inactive: "gray" };
  const txStatusBadge = { Completed: "green", Flagged: "red", "Under Review": "amber", Declined: "gray" };
  const rlBadge = { "High Risk": "orange", Suspicious: "red", "Medium Risk": "amber", Normal: "green" };

  const allTx = DB.txForCustomer(customer.customer_id).slice().sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

  /* -------- Evidence: derive "why flagged" from ALL transaction signals -------- */
  const flagsSeen = { newBeneficiary: 0, newDevice: 0, locationMismatch: 0, unusualTime: 0 };
  allTx.forEach(t => {
    if (t.is_new_beneficiary) flagsSeen.newBeneficiary++;
    if (t.is_new_device) flagsSeen.newDevice++;
    if (t.location_mismatch) flagsSeen.locationMismatch++;
    if (t.is_unusual_time) flagsSeen.unusualTime++;
  });
  const evidenceItems = [
    { label: "New beneficiary payments", count: flagsSeen.newBeneficiary },
    { label: "Logins from new devices", count: flagsSeen.newDevice },
    { label: "Location mismatches", count: flagsSeen.locationMismatch },
    { label: "Transactions at unusual hours", count: flagsSeen.unusualTime },
  ].filter(e => e.count > 0);

  const suspiciousCount = allTx.filter(t => t.risk_level === "Suspicious").length;
  const totalTxAmount = allTx.reduce((s, t) => s + t.amount, 0);

  /* -------- Layout -------- */
  main.innerHTML = `
    <div class="detail-hero">
      <div class="avatar-lg">${initials(customer.full_name)}</div>
      <div class="who">
        <h2>${customer.full_name}</h2>
        <p>${customer.customer_id} · ${customer.email} · ${customer.mobile}</p>
        <div class="badges">
          <span class="badge ${levelBadge[customer.risk_level] || "gray"}">${customer.risk_level} Risk · ${customer.risk_score}/100</span>
          <span class="badge ${statusBadgeMap[customer.customer_status] || "gray"}">${customer.customer_status}</span>
          <span class="badge ${customer.kyc_status === "Verified" ? "green" : "amber"}">KYC ${customer.kyc_status}</span>
          ${customer.open_disputes > 0 ? `<span class="badge red">${customer.open_disputes} open dispute${customer.open_disputes > 1 ? "s" : ""}</span>` : ""}
          ${suspiciousCount > 0 ? `<span class="badge orange">${suspiciousCount} suspicious txn${suspiciousCount > 1 ? "s" : ""}</span>` : ""}
          ${customer.loan_id ? `<a href="loan-accounts.html" class="badge violet" style="text-decoration:none;">Loan ${customer.loan_id}</a>` : ""}
        </div>
      </div>
      <a href="customers.html" class="back-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>All Customers</a>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="icon icon-violet"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="13" rx="2"/><path d="M2 10h20"/></svg></div>
        <div class="label">Account Balance</div><div class="value">${fmtINR(customer.balance)}</div>
        <div class="delta"><span class="muted">${customer.account_type} · ${customer.account_number_masked}</span></div>
      </div>
      <div class="kpi-card">
        <div class="icon icon-blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 7h10M7 12h10M7 17h6"/></svg></div>
        <div class="label">Transactions on Record</div><div class="value">${fmtNum(allTx.length)}</div>
        <div class="delta up">${fmtINR(totalTxAmount)} total value</div>
      </div>
      <div class="kpi-card">
        <div class="icon icon-amber"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg></div>
        <div class="label">Disputes</div><div class="value">${customer.total_disputes}</div>
        <div class="delta"><span class="muted">${customer.open_disputes} open · ${customer.resolved_disputes} resolved</span></div>
      </div>
      <div class="kpi-card">
        <div class="icon ${levelBadge[customer.risk_level] === "red" ? "icon-red" : levelBadge[customer.risk_level] === "orange" ? "icon-orange" : levelBadge[customer.risk_level] === "amber" ? "icon-amber" : "icon-green"}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l8 3v6c0 5-3.4 8.8-8 11-4.6-2.2-8-6-8-11V5l8-3z"/></svg>
        </div>
        <div class="label">Risk Score</div><div class="value">${customer.risk_score}/100</div>
        <div class="delta"><span class="muted">${customer.risk_level} risk</span></div>
      </div>
    </div>

    <div class="panel-grid grid-2-1">
      <div class="panel">
        <div class="panel-head"><div><h3>Customer Information</h3><p>Profile details on file</p></div></div>
        <div class="info-grid">
          <div class="cell"><span>Full Name</span><b>${customer.full_name}</b></div>
          <div class="cell"><span>Customer ID</span><b>${customer.customer_id}</b></div>
          <div class="cell"><span>Email</span><b>${customer.email}</b></div>
          <div class="cell"><span>Mobile</span><b>${customer.mobile}</b></div>
          <div class="cell"><span>City / State</span><b>${customer.city}, ${customer.state}</b></div>
          <div class="cell"><span>Occupation</span><b>${customer.occupation}</b></div>
          <div class="cell"><span>Account ID</span><b>${customer.account_id}</b></div>
          <div class="cell"><span>Account No.</span><b>${customer.account_number_masked}</b></div>
          <div class="cell"><span>Account Type</span><b>${customer.account_type}</b></div>
          <div class="cell"><span>Account Opened</span><b>${fmtDate(customer.account_opened_date)}</b></div>
          <div class="cell"><span>KYC Status</span><b>${customer.kyc_status}</b></div>
          <div class="cell"><span>Customer Status</span><b>${customer.customer_status}</b></div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head"><h3>AI Risk Evidence</h3></div>
        ${evidenceItems.length ? `
          <ul class="mlist">
            ${evidenceItems.map(e => `<li><span>${e.label}</span><b>${e.count} of ${allTx.length}</b></li>`).join("")}
          </ul>
          <div class="modal-note" style="margin-top:14px;">These signals across all ${allTx.length} transactions on record are the main contributors behind this customer's ${customer.risk_level} risk score.</div>
        ` : `<div class="empty-state" style="padding:20px 8px;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:block;margin:0 auto 8px;"><path d="M20 6L9 17l-5-5"/></svg>
              No anomaly signals in this customer's transaction history.</div>`}
      </div>
    </div>

    <div class="panel" style="margin-bottom:16px;">
      <div class="panel-head">
        <div><h3>Transaction History</h3><p>All ${allTx.length} transactions on record for this customer</p></div>
        <div style="display:flex; gap:8px; align-items:center;">
          <input type="text" id="txSearch" placeholder="Search transaction ID, type, location…" style="border:1px solid var(--border); border-radius:8px; padding:7px 10px; font-size:12.5px;">
        </div>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>ID</th><th>Date</th><th>Type</th><th>Amount</th><th>Location</th><th>Risk</th><th>Status</th></tr></thead>
          <tbody id="custTxBody"></tbody>
        </table>
      </div>
      <div class="pagination" id="custTxPagination"></div>
    </div>

    <div class="panel">
      <div class="panel-head"><h3>Dispute Summary</h3></div>
      ${customer.total_disputes > 0 ? `
        <ul class="mlist">
          <li><span>Total disputes filed</span><b>${customer.total_disputes}</b></li>
          <li><span>Open / under review</span><b>${customer.open_disputes}</b></li>
          <li><span>Resolved</span><b>${customer.resolved_disputes}</b></li>
        </ul>
        <div class="modal-note" style="margin-top:14px;">The CSV tracks dispute counts per customer, not individual case records (ID, reason, date) — so this summary reflects exactly what's in the data, without inventing case-level detail.</div>
      ` : `<div class="empty-state" style="padding:20px 8px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:block;margin:0 auto 8px;"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>
            No disputes filed by this customer.</div>`}
    </div>

    <div class="panel">
      <div class="panel-head"><h3>Admin Actions</h3></div>
      <div class="quick-actions">
        <button onclick="AegisDetail.decide('favor')"><span class="qicon icon-green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg></span>Resolve in Customer's Favor</button>
        <button onclick="AegisDetail.decide('reject')"><span class="qicon icon-red"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></span>Reject Dispute</button>
        <button onclick="AegisDetail.decide('info')"><span class="qicon icon-amber"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/></svg></span>Request More Information</button>
        <button onclick="AegisDetail.flag()"><span class="qicon icon-orange"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l8 3v6c0 5-3.4 8.8-8 11-4.6-2.2-8-6-8-11V5l8-3z"/></svg></span>Flag Account for Review</button>
      </div>
    </div>
  `;

  createListPage({
    data: allTx,
    pageSize: 10,
    searchInputId: "txSearch",
    searchFields: ["id", "type", "location", "merchant"],
    filters: [],
    bodyId: "custTxBody",
    countId: null,
    paginationId: "custTxPagination",
    colSpan: 7,
    rowAttrs: t => `onclick="location.href='transaction-details.html?id=${t.id}'"`,
    columns: [
      { render: t => `<span class="mono">${t.id}</span>` },
      { render: t => fmtDate(t.date) },
      { render: t => t.type },
      { render: t => `<span class="amount-out">${fmtINR(t.amount)}</span>` },
      { render: t => t.location },
      { render: t => `<span class="badge ${rlBadge[t.risk_level] || "gray"}">${t.risk_level}</span>` },
      { render: t => `<span class="badge ${txStatusBadge[t.status] || "gray"}">${t.status}</span>` },
    ],
    emptyMessage: "No transactions on record.",
  });

  window.AegisDetail = {
    decide(kind) {
      const copy = {
        favor: { title: "Decision recorded", body: `<p>Case marked <b>Resolved in ${customer.full_name}'s favor</b>.</p><div class="modal-note">This demo doesn't persist decisions — wire this button to your FastAPI backend to update the dispute status for real.</div>` },
        reject: { title: "Decision recorded", body: `<p>Dispute for <b>${customer.full_name}</b> marked <b>Rejected</b>.</p><div class="modal-note">This demo doesn't persist decisions — wire this button to your FastAPI backend to update the dispute status for real.</div>` },
        info: { title: "Request sent", body: `<p>A request for more information would be sent to <b>${customer.email}</b>.</p><div class="modal-note">Messaging isn't wired to a real channel in this demo.</div>` },
      }[kind];
      AuditLog.record("Decision", "Dispute", `${kind} — ${customer.customer_id}`);
      window.AegisModal.open(copy.title, copy.body, `<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>`, "icon-amber");
    },
    flag() {
      AuditLog.record("Flag", "Customer", customer.customer_id);
      window.AegisModal.open("Account flagged", `<p><b>${customer.full_name}</b> (${customer.customer_id}) has been flagged for manual review.</p><div class="modal-note">This demo doesn't persist flags — wire this to your backend's account-status field.</div>`,
        `<path d="M12 2l8 3v6c0 5-3.4 8.8-8 11-4.6-2.2-8-6-8-11V5l8-3z"/>`, "icon-orange");
    }
  };
})();
