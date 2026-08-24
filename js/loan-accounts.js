/* ============================================================
   AEGIS BANK — Loan Accounts page
   Everything here comes from DB.loans (built in db.js straight
   off bankdispute_customers_2500_with_loan_repayment.csv). No
   loan, EMI, or customer values are invented.
   ============================================================ */
(function () {
  const session = AdminSidebar.mount("loans");
  if (!session) return;
  AuditLog.record("View", "Loan Accounts");

  const fmtINR = n => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
  const fmtNum = n => Number(n || 0).toLocaleString("en-IN");
  const fmtDate = d => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  const loans = DB.loans;
  const stats = DB.loanStats();

  document.getElementById("countSub").textContent =
    `${stats.totalLoanAccounts.toLocaleString("en-IN")} of ${DB.customers.length.toLocaleString("en-IN")} customers hold an active loan · click "View Details" for the full repayment schedule.`;

  /* -------- Loan Overview Cards -------- */
  const kpis = [
    { label: "Total Loan Accounts", value: fmtNum(stats.totalLoanAccounts), icon: "icon-violet", svg: `<circle cx="12" cy="12" r="9"/><path d="M8 12h8M12 8v8"/>` },
    { label: "Total Loan Amount", value: fmtINR(stats.totalLoanAmount), icon: "icon-blue", svg: `<path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>` },
    { label: "Total EMI Amount", value: fmtINR(stats.totalEmiAmount), icon: "icon-green", svg: `<path d="M7 7h10M7 12h10M7 17h6"/>` },
    { label: "Average Loan Amount", value: fmtINR(stats.avgLoanAmount), icon: "icon-amber", svg: `<path d="M3 12h4l3 8 4-16 3 8h4"/>` },
    { label: "On-Time Repayments", value: fmtNum(stats.onTimeRepayments), icon: "icon-green", svg: `<path d="M20 6L9 17l-5-5"/>` },
    { label: "Late Repayments", value: fmtNum(stats.lateRepayments), icon: "icon-red", svg: `<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>` },
  ];
  document.getElementById("kpiGrid").innerHTML = kpis.map(k => `
    <div class="kpi-card">
      <div class="icon ${k.icon}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${k.svg}</svg></div>
      <div class="label">${k.label}</div><div class="value">${k.value}</div>
    </div>`).join("");

  /* -------- Loan Accounts Table -------- */
  const patternBadge = { "On Time": "green", Mixed: "amber", "Mostly Late": "red" };
  const statusBadge = { "Good Standing": "green", Watch: "amber", "At Risk": "red" };

  createListPage({
    data: loans,
    pageSize: 25,
    searchInputId: "searchInput",
    searchFields: ["loan_id", "customer_id", "customer_name"],
    filters: [
      { elId: "patternFilter", field: "repayment_pattern" },
      { elId: "statusFilter", field: "loan_status" },
    ],
    sortSelectId: "sortFilter",
    sortFns: {
      amount_desc: (a, b) => b.loan_amount - a.loan_amount,
      amount_asc: (a, b) => a.loan_amount - b.loan_amount,
      emi_desc: (a, b) => b.emi_amount - a.emi_amount,
      late_desc: (a, b) => b.emi_paid_late - a.emi_paid_late,
    },
    defaultSort: "amount_desc",
    bodyId: "loansBody",
    countId: "resultsCount",
    paginationId: "pagination",
    colSpan: 9,
    rowAttrs: () => "",
    columns: [
      { render: l => `<span class="mono">${l.customer_id}</span>` },
      { render: l => l.customer_name },
      { render: l => `<span class="mono">${l.loan_id}</span>` },
      { render: l => fmtINR(l.loan_amount) },
      { render: l => fmtINR(l.emi_amount) },
      { render: l => `${l.loan_tenure_months} mo` },
      { render: l => `<span class="badge ${patternBadge[l.repayment_pattern] || "gray"}">${l.repayment_pattern}</span>` },
      { render: l => `<span class="badge ${statusBadge[l.loan_status] || "gray"}">${l.loan_status}</span>` },
      { render: l => `<button class="view-details-btn" data-loan-id="${l.loan_id}" style="border:1px solid var(--border); background:#fff; padding:6px 12px; border-radius:8px; font-size:12px; font-weight:700; color:var(--violet-600); cursor:pointer;">View Details</button>` },
    ],
    emptyMessage: "No loan accounts match your filters.",
  });

  /* -------- View Details -> full loan modal (event delegation, survives re-render) -------- */
  document.getElementById("loansBody").addEventListener("click", (e) => {
    const btn = e.target.closest(".view-details-btn");
    if (!btn) return;
    openLoanDetails(btn.dataset.loanId);
  });

  const emiStatusBadge = { "Paid On Time": "green", "Paid Late": "amber" };

  function openLoanDetails(loanId) {
    const loan = DB.loanById.get(loanId);
    if (!loan) return;
    const c = DB.custById.get(loan.customer_id);
    if (!c) return;

    AuditLog.record("View", "Loan Accounts", "Opened loan " + loanId);

    const emiRows = loan.emi_schedule.map(e => `
      <tr>
        <td><b>EMI ${e.emi_no}</b></td>
        <td>${fmtDate(e.due_date)}</td>
        <td>${fmtDate(e.paid_date)}</td>
        <td><span class="badge ${emiStatusBadge[e.status] || "gray"}">${e.status}</span></td>
        <td>${e.days_late > 0 ? `${e.days_late} days` : "—"}</td>
      </tr>`).join("");

    const levelBadge = { Low: "green", Medium: "amber", High: "orange", "Very High": "red" };

    const body = `
      <div class="mstat-grid">
        <div class="mstat"><b>${fmtINR(loan.loan_amount)}</b><span>Loan amount</span></div>
        <div class="mstat"><b>${fmtINR(loan.emi_amount)}</b><span>EMI amount</span></div>
      </div>

      <div style="font-size:12.5px; font-weight:700; color:var(--navy-950); margin:16px 0 8px;">Customer Information</div>
      <ul class="mlist">
        <li><span>Customer ID</span><b>${c.customer_id}</b></li>
        <li><span>Full name</span><b>${c.full_name}</b></li>
        <li><span>Account ID</span><b>${c.account_id}</b></li>
        <li><span>Account number</span><b>${c.account_number_masked}</b></li>
        <li><span>Mobile</span><b>${c.mobile}</b></li>
        <li><span>Email</span><b>${c.email}</b></li>
        <li><span>City / State</span><b>${c.city}, ${c.state}</b></li>
        <li><span>Occupation</span><b>${c.occupation}</b></li>
        <li><span>Monthly income</span><b>${c.monthly_income != null ? fmtINR(c.monthly_income) : "—"}</b></li>
      </ul>

      <div style="font-size:12.5px; font-weight:700; color:var(--navy-950); margin:18px 0 8px;">Loan Information</div>
      <ul class="mlist">
        <li><span>Loan ID</span><b>${loan.loan_id}</b></li>
        <li><span>Loan amount</span><b>${fmtINR(loan.loan_amount)}</b></li>
        <li><span>EMI amount</span><b>${fmtINR(loan.emi_amount)}</b></li>
        <li><span>Tenure</span><b>${loan.loan_tenure_months} months</b></li>
        <li><span>Repayment pattern</span><b><span class="badge ${patternBadge[loan.repayment_pattern] || "gray"}">${loan.repayment_pattern}</span></b></li>
        <li><span>Loan status</span><b><span class="badge ${statusBadge[loan.loan_status] || "gray"}">${loan.loan_status}</span></b></li>
        <li><span>Customer risk level</span><b><span class="badge ${levelBadge[c.risk_level] || "gray"}">${c.risk_level}</span></b></li>
        <li><span>Risk score</span><b>${c.risk_score}/100</b></li>
      </ul>

      <div style="font-size:12.5px; font-weight:700; color:var(--navy-950); margin:18px 0 8px;">EMI Repayment Schedule</div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>EMI</th><th>Due Date</th><th>Paid Date</th><th>Status</th><th>Days Late</th></tr></thead>
          <tbody>${emiRows || `<tr><td colspan="5" style="text-align:center; color:var(--ink-500); padding:16px;">No EMI records found for this loan.</td></tr>`}</tbody>
        </table>
      </div>

      <div style="margin-top:16px;">
        <a href="customer-details.html?id=${c.customer_id}" style="display:block; text-align:center; background:var(--navy-950); color:#fff; padding:11px; border-radius:9px; font-weight:700; font-size:12.5px; text-decoration:none;">Open full customer profile →</a>
      </div>
    `;

    AegisModal.open(
      `Loan ${loan.loan_id} — ${c.full_name}`,
      body,
      `<circle cx="12" cy="12" r="9"/><path d="M8 12h8M12 8v8"/>`,
      "icon-violet",
      true // wide modal — there's a lot to show
    );
  }
})();
