/* ============================================================
   AEGIS BANK — Admin Dashboard render logic
   Every number here is computed live from DB (which is built
   straight off the uploaded CSVs) — nothing is pre-baked.
   ============================================================ */
(function () {
  const session = AdminSidebar.mount("dashboard");
  if (!session) return;
  AuditLog.record("View", "Dashboard");

  const fmtINR = n => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
  const fmtNum = n => Number(n || 0).toLocaleString("en-IN");

  document.getElementById("topName").textContent = session.name || "Admin";

  const customers = DB.customers, transactions = DB.transactions, accounts = DB.accounts, disputes = DB.disputes;
  const loanStats = DB.loanStats();

  /* -------- Live KPI computation (no hardcoded counts) -------- */
  const totalCustomers = customers.length;
  const totalAccounts = accounts.length;
  const totalTransactions = transactions.length;
  const totalDisputes = customers.reduce((s, c) => s + c.total_disputes, 0);
  const openDisputes = customers.reduce((s, c) => s + c.open_disputes, 0);
  const resolvedDisputes = customers.reduce((s, c) => s + c.resolved_disputes, 0);
  const suspiciousTx = transactions.filter(t => t.risk_level === "Suspicious");
  const highRiskAlerts = transactions.filter(t => t.risk_level === "High Risk" || t.risk_level === "Suspicious").length;

  document.getElementById("topAlertCount").textContent = DB.unreadCount() > 999 ? "999+" : DB.unreadCount();

  const kpiDefs = [
    { label: "Total Customers", value: fmtNum(totalCustomers), icon: "icon-blue", href: "customers.html", svg: `<circle cx="9" cy="7" r="4"/><path d="M2 21c0-4.4 3.1-8 7-8s7 3.6 7 8"/><circle cx="17" cy="9" r="3"/>` },
    { label: "Total Accounts", value: fmtNum(totalAccounts), icon: "icon-violet", href: "accounts.html", svg: `<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/>` },
    { label: "Total Transactions", value: fmtNum(totalTransactions), icon: "icon-green", href: "transactions.html", svg: `<path d="M7 7h10M7 12h10M7 17h6"/>` },
    { label: "Loan Accounts", value: fmtNum(loanStats.totalLoanAccounts), icon: "icon-violet", href: "loan-accounts.html", svg: `<circle cx="12" cy="12" r="9"/><path d="M8 12h8M12 8v8"/>` },
    { label: "Suspicious Transactions", value: fmtNum(suspiciousTx.length), icon: "icon-orange", href: "suspicious-detection.html", svg: `<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>` },
    { label: "High-Risk Alerts", value: fmtNum(highRiskAlerts), icon: "icon-red", href: "alerts.html", svg: `<path d="M12 2l8 3v6c0 5-3.4 8.8-8 11-4.6-2.2-8-6-8-11V5l8-3z"/>` },
    { label: "Resolved Disputes", value: fmtNum(resolvedDisputes), icon: "icon-green", href: "disputes.html?status=Resolved", svg: `<path d="M20 6L9 17l-5-5"/>` },
    { label: "Total Disputes", value: fmtNum(totalDisputes), icon: "icon-amber", href: "disputes.html", svg: `<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>` },
  ];
  document.getElementById("kpiGrid").innerHTML = kpiDefs.map(k => `
    <a href="${k.href}" class="kpi-card clickable" style="text-decoration:none; color:inherit; display:block;" title="View details">
      <div class="icon ${k.icon}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${k.svg}</svg></div>
      <div class="label">${k.label}</div>
      <div class="value">${k.value}</div>
      <div class="delta up">View details →</div>
    </a>`).join("");

  /* -------- Risk Level Distribution (customers.risk_level) -------- */
  const riskColors = { Low: "#17a06a", Medium: "#d68a00", High: "#e0662f", "Very High": "#dc3545" };
  const riskOrder = ["Low", "Medium", "High", "Very High"];
  const riskDist = {};
  riskOrder.forEach(k => riskDist[k] = 0);
  customers.forEach(c => { if (riskDist[c.risk_level] !== undefined) riskDist[c.risk_level]++; });
  const riskTotal = Object.values(riskDist).reduce((a, b) => a + b, 0);
  document.getElementById("riskLegend").innerHTML = riskOrder.map(k => `
    <div class="item">
      <span class="swatch" style="background:${riskColors[k]}"></span>
      <span>${k} Risk</span>
      <b>${fmtNum(riskDist[k])}</b><span class="pct">(${riskTotal ? (riskDist[k] / riskTotal * 100).toFixed(1) : "0.0"}%)</span>
    </div>`).join("");
  ChartsLite.donut(document.getElementById("riskDonut"), {
    data: riskDist, colors: riskColors,
    onClick: (label) => location.href = `customers.html?risk=${encodeURIComponent(label)}`
  });

  /* -------- Transaction Risk Trend (monthly, by risk_level) -------- */
  const trendColors = { Normal: "#17a06a", "Medium Risk": "#d68a00", "High Risk": "#e0662f", Suspicious: "#dc3545" };
  const monthBuckets = new Map(); // "2026-08" -> { Normal: n, ... }
  transactions.forEach(t => {
    const month = (t.date || "").slice(0, 7);
    if (!month) return;
    if (!monthBuckets.has(month)) monthBuckets.set(month, { Normal: 0, "Medium Risk": 0, "High Risk": 0, Suspicious: 0 });
    const b = monthBuckets.get(month);
    if (b[t.risk_level] !== undefined) b[t.risk_level]++;
  });
  const months = [...monthBuckets.keys()].sort().slice(-6);
  const monthLabels = months.map(m => {
    const [y, mo] = m.split("-");
    return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString("en-IN", { month: "short" });
  });
  ChartsLite.line(document.getElementById("trendLine"), {
    labels: monthLabels,
    series: Object.keys(trendColors).map(level => ({
      label: level, data: months.map(m => (monthBuckets.get(m) || {})[level] || 0)
    })),
    colors: trendColors
  });

  /* -------- Suspicious Transactions panel (real, top 10 by date) -------- */
  const suspTxStatusBadge = { Completed: "green", Flagged: "red", "Under Review": "amber", Declined: "gray" };
  const suspRecent = suspiciousTx.slice().sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)).slice(0, 8);
  document.getElementById("suspiciousTxBody").innerHTML = suspRecent.map(t => `
    <tr class="clickable" onclick="location.href='transaction-details.html?id=${t.id}'" title="Open transaction ${t.id}">
      <td class="mono">${t.id}</td>
      <td>${t.customer_id}</td>
      <td>${t.type}</td>
      <td class="amount-out">${fmtINR(t.amount)}</td>
      <td><b>${t.risk_score}</b></td>
      <td>${t.channel}</td>
      <td><span class="badge ${suspTxStatusBadge[t.status] || "gray"}">${t.status}</span></td>
    </tr>`).join("") || `<tr><td colspan="7" style="text-align:center; color:var(--ink-500); padding:20px;">No suspicious transactions found.</td></tr>`;
  document.getElementById("suspiciousCount").textContent = fmtNum(suspiciousTx.length);
  document.getElementById("suspiciousAmount").textContent = fmtINR(suspiciousTx.reduce((s, t) => s + t.amount, 0));

  /* -------- Recent high-risk transactions -------- */
  const rlBadge = { "High Risk": "orange", Suspicious: "red", "Medium Risk": "amber", Normal: "green" };
  const highRiskRecent = transactions.filter(t => t.risk_level === "High Risk" || t.risk_level === "Suspicious")
    .slice().sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)).slice(0, 8);
  document.getElementById("highRiskTxBody").innerHTML = highRiskRecent.map(t => `
    <tr class="clickable" onclick="location.href='transaction-details.html?id=${t.id}'" title="Open transaction ${t.id}">
      <td class="mono">${t.id}</td>
      <td>${t.customer_id}</td>
      <td class="amount-out">${fmtINR(t.amount)}</td>
      <td><b>${t.risk_score}</b></td>
      <td><span class="badge ${rlBadge[t.risk_level] || "gray"}">${t.risk_level}</span></td>
    </tr>`).join("");

  /* -------- Top high-risk customers -------- */
  const levelBadge = { Low: "green", Medium: "amber", High: "orange", "Very High": "red" };
  const topRisk = customers.slice().sort((a, b) => b.risk_score - a.risk_score).slice(0, 8);
  document.getElementById("topRiskBody").innerHTML = topRisk.map(c => `
    <tr class="clickable" onclick="location.href='customer-details.html?id=${c.customer_id}'" title="Open ${c.customer_id}'s profile">
      <td>${c.full_name}</td>
      <td class="mono">${c.customer_id}</td>
      <td><b>${c.risk_score}</b></td>
      <td><span class="badge ${levelBadge[c.risk_level] || "gray"}">${c.risk_level}</span></td>
    </tr>`).join("");

  /* -------- Customers with open disputes -------- */
  document.getElementById("disputesBody").innerHTML = disputes.filter(d => d.open > 0).slice(0, 8).map(d => `
    <tr class="clickable" onclick="location.href='customer-details.html?id=${d.customer_id}'" title="Open ${d.customer_id}'s profile">
      <td>${d.customer_name}</td>
      <td class="mono">${d.customer_id}</td>
      <td><span class="badge amber">${d.open}</span></td>
      <td>${d.resolved}</td>
      <td>${d.total}</td>
      <td><span class="badge ${levelBadge[d.risk_level] || "gray"}">${d.risk_level}</span></td>
    </tr>`).join("") || `<tr><td colspan="6" style="text-align:center; color:var(--ink-500); padding:20px;">No open disputes.</td></tr>`;

  /* -------- Transaction classification -------- */
  const classMap = {
    Normal: { label: "Normal", color: "green", swatch: "#17a06a" },
    "Medium Risk": { label: "Medium Risk", color: "amber", swatch: "#d68a00" },
    "High Risk": { label: "High Risk", color: "orange", swatch: "#e0662f" },
    Suspicious: { label: "Suspicious", color: "red", swatch: "#dc3545" }
  };
  const classCounts = {}; Object.keys(classMap).forEach(k => classCounts[k] = 0);
  const classAmounts = {}; Object.keys(classMap).forEach(k => classAmounts[k] = 0);
  transactions.forEach(t => { if (classCounts[t.risk_level] !== undefined) { classCounts[t.risk_level]++; classAmounts[t.risk_level] += t.amount; } });
  const classTotal = Object.values(classCounts).reduce((a, b) => a + b, 0) || 1;
  document.getElementById("classificationList").innerHTML = Object.keys(classMap).map(k => {
    const info = classMap[k];
    const count = classCounts[k] || 0;
    const pct = (count / classTotal * 100).toFixed(1);
    return `
      <div>
        <div style="display:flex; justify-content:space-between; font-size:12.5px; margin-bottom:6px;">
          <span><span class="badge ${info.color}" style="padding:2px 8px;">${info.label}</span></span>
          <span style="color:var(--ink-500);">${fmtNum(count)} txns · ${fmtINR(classAmounts[k])}</span>
        </div>
        <div style="height:8px; background:#eef0f5; border-radius:999px; overflow:hidden;">
          <div style="height:100%; width:${pct}%; background:${info.swatch}; border-radius:999px;"></div>
        </div>
        <div style="text-align:right; font-size:11px; color:var(--ink-500); margin-top:3px;">${pct}%</div>
      </div>`;
  }).join("");
})();
