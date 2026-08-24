/* ============================================================
   AEGIS BANK — Central Data Store (DB)
   Everything here is derived directly from the three uploaded
   CSVs (customers, login credentials, transactions). Nothing
   in this file invents a customer, account, transaction, or
   dispute reason that isn't backed by a CSV field.

   DB.customers    -> CUSTOMERS (from bankdispute_customers_2500.csv + login CSV)
   DB.transactions -> TRANSACTIONS (all 20,000 rows, customer_transactions_20000_updated.csv)
   DB.accounts     -> 1 account per customer, derived from the customer CSV's
                      account_id / account_number_masked / account_type / balance fields
   DB.disputes     -> customer-level aggregates (total/open/resolved) straight from
                      the CSV's dispute count columns — no fabricated reason/date,
                      because the CSV has no per-case dispute rows.
   DB.alerts       -> derived, one alert per real risk signal found on a real
                      transaction (new device, new beneficiary, location mismatch,
                      unusual time, High Risk / Suspicious classification).
   ============================================================ */
const DB = (function () {
  const customers = (typeof CUSTOMERS !== "undefined") ? CUSTOMERS : [];
  const transactions = (typeof TRANSACTIONS !== "undefined") ? TRANSACTIONS : [];

  const txByCustomer = new Map();
  transactions.forEach(t => {
    if (!txByCustomer.has(t.customer_id)) txByCustomer.set(t.customer_id, []);
    txByCustomer.get(t.customer_id).push(t);
  });

  const custById = new Map(customers.map(c => [c.customer_id, c]));

  /* ---- Accounts: 1 per customer, exactly the fields the CSV has ---- */
  const accounts = customers.map(c => {
    const custTx = txByCustomer.get(c.customer_id) || [];
    return {
      account_id: c.account_id,
      account_number_masked: c.account_number_masked,
      account_type: c.account_type,
      customer_id: c.customer_id,
      customer_name: c.full_name,
      balance: c.balance,
      status: c.customer_status,
      kyc_status: c.kyc_status,
      opened_date: c.account_opened_date,
      transaction_count: custTx.length || c.total_transactions,
      risk_score: c.risk_score,
      risk_level: c.risk_level,
    };
  });
  const acctById = new Map(accounts.map(a => [a.account_id, a]));

  /* ---- Loans: only customers with a real loan_id from the CSV. Loan Status is
     derived from the CSV's own repayment_pattern field (On Time -> Good Standing,
     Mixed -> Watch, Mostly Late -> At Risk) — a straightforward relabel, not an
     invented value. EMI schedule rows come straight from emi_N_* columns. ---- */
  const loans = customers.filter(c => c.loan_id).map(c => {
    const paidOnTime = c.emi_schedule.filter(e => e.status === "Paid On Time").length;
    const paidLate = c.emi_schedule.filter(e => e.status === "Paid Late").length;
    const statusMap = { "On Time": "Good Standing", "Mixed": "Watch", "Mostly Late": "At Risk" };
    return {
      loan_id: c.loan_id,
      customer_id: c.customer_id,
      customer_name: c.full_name,
      loan_amount: c.loan_amount,
      emi_amount: c.emi_amount,
      loan_tenure_months: c.loan_tenure_months,
      repayment_pattern: c.repayment_pattern,
      loan_status: statusMap[c.repayment_pattern] || c.repayment_pattern,
      emi_schedule: c.emi_schedule,
      emi_paid_on_time: paidOnTime,
      emi_paid_late: paidLate,
      risk_level: c.risk_level,
      risk_score: c.risk_score,
    };
  });
  const loanById = new Map(loans.map(l => [l.loan_id, l]));

  function loanStats() {
    const totalLoanAmount = loans.reduce((s, l) => s + l.loan_amount, 0);
    const totalEmiAmount = loans.reduce((s, l) => s + l.emi_amount, 0);
    const onTime = loans.reduce((s, l) => s + l.emi_paid_on_time, 0);
    const late = loans.reduce((s, l) => s + l.emi_paid_late, 0);
    return {
      totalLoanAccounts: loans.length,
      totalLoanAmount,
      totalEmiAmount,
      avgLoanAmount: loans.length ? totalLoanAmount / loans.length : 0,
      onTimeRepayments: onTime,
      lateRepayments: late,
    };
  }

  /* ---- Disputes: customer-level aggregate, no invented reasons/dates ---- */
  const disputes = customers.filter(c => c.total_disputes > 0).map(c => ({
    customer_id: c.customer_id,
    customer_name: c.full_name,
    account_id: c.account_id,
    total: c.total_disputes,
    open: c.open_disputes,
    resolved: c.resolved_disputes,
    risk_level: c.risk_level,
    risk_score: c.risk_score,
  })).sort((a, b) => b.open - a.open || b.total - a.total);

  /* ---- Alerts: derived from real per-transaction risk flags ---- */
  function buildAlerts() {
    const alerts = [];
    let seq = 1;
    transactions.forEach(t => {
      const reasons = [];
      if (t.is_new_device) reasons.push("New device login");
      if (t.is_new_beneficiary) reasons.push("New beneficiary");
      if (t.location_mismatch) reasons.push("Location mismatch");
      if (t.is_unusual_time) reasons.push("Unusual transaction time");
      if (t.risk_level === "Suspicious") reasons.push("Suspicious transaction");
      else if (t.risk_level === "High Risk") reasons.push("High-risk transaction");
      if (reasons.length === 0) return;
      alerts.push({
        alert_id: "ALRT_" + String(seq++).padStart(6, "0"),
        transaction_id: t.id,
        customer_id: t.customer_id,
        date: t.date,
        time: t.time,
        type: reasons[0],
        all_reasons: reasons,
        risk_level: t.risk_level,
        risk_score: t.risk_score,
        amount: t.amount,
        status: t.status,
      });
    });
    return alerts.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  }
  let _alertsCache = null;
  function alerts() { if (!_alertsCache) _alertsCache = buildAlerts(); return _alertsCache; }

  /* ---- Read/unread state for alerts, persisted locally (real session state) ---- */
  const READ_KEY = "aegis_read_alerts";
  function getReadSet() {
    try { return new Set(JSON.parse(localStorage.getItem(READ_KEY) || "[]")); }
    catch (e) { return new Set(); }
  }
  function markRead(alertId) {
    const s = getReadSet(); s.add(alertId);
    localStorage.setItem(READ_KEY, JSON.stringify([...s]));
  }
  /** Mark many alerts read in one localStorage read+write (avoids O(n^2) when
      called with a large batch — markRead() alone re-reads/re-writes the whole
      set on every single call, which is fine for one row but not for hundreds). */
  function markReadBatch(alertIds) {
    if (!alertIds || !alertIds.length) return;
    const s = getReadSet();
    alertIds.forEach(id => s.add(id));
    localStorage.setItem(READ_KEY, JSON.stringify([...s]));
  }
  function markAllRead() {
    const s = new Set(alerts().map(a => a.alert_id));
    localStorage.setItem(READ_KEY, JSON.stringify([...s]));
  }
  function unreadCount() {
    const read = getReadSet();
    return alerts().filter(a => !read.has(a.alert_id)).length;
  }

  return {
    customers, transactions, accounts, disputes, loans,
    custById, acctById, txByCustomer, loanById, loanStats,
    alerts, getReadSet, markRead, markReadBatch, markAllRead, unreadCount,
    txForCustomer: (id) => txByCustomer.get(id) || [],
  };
})();
