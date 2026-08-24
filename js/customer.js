/* ============================================================
   AEGIS BANK — Customer Dashboard render logic
   ============================================================ */
(function () {
  const session = AegisAuth.guard("customer", "../login.html");
  if (!session) return;

  const customer = CUSTOMERS.find(c => c.customer_id === session.customer_id);
  if (!customer) { AegisAuth.logout("../login.html"); return; }

  // Transactions now come from the shared DB (built from TRANSACTIONS), not a
  // per-customer duplicate — sorted newest first, same as before.
  const customerTransactions = DB.txForCustomer(customer.customer_id)
    .slice()
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

  const fmtINR = n => "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });
  const initials = name => name.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();
  const fmtDate = d => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  /* -------- Header / sidebar identity -------- */
  document.getElementById("welcomeName").textContent = customer.full_name.split(" ")[0];
  document.getElementById("sideAvatar").textContent = initials(customer.full_name);
  document.getElementById("sideName").textContent = customer.full_name;
  document.getElementById("sideId").textContent = customer.customer_id;
  document.getElementById("topAvatar").textContent = initials(customer.full_name);
  document.getElementById("topName").textContent = customer.full_name;
  document.getElementById("topId").textContent = customer.customer_id;
  document.getElementById("disputeCount").textContent = customer.open_disputes;
  if (customer.open_disputes === 0) document.getElementById("disputeCount").style.display = "none";

  document.getElementById("logoutBtn").addEventListener("click", () => AegisAuth.logout("../login.html"));
  document.getElementById("raiseDisputeBtn").addEventListener("click", () => {
    if (window.AegisModal) {
      window.AegisModal.open(
        "Raise a Dispute",
        `<p>Pick a transaction from your Recent Transactions table to start a dispute against it.</p>
         <div class="modal-note">The full multi-step raise-dispute flow (reason, description, evidence upload) isn't wired up in this demo yet.</div>`,
        `<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>`,
        "icon-red"
      );
    }
  });

  /* -------- KPI cards -------- */
  document.getElementById("kpiBalance").textContent = fmtINR(customer.balance);
  document.getElementById("kpiAccountType").textContent = customer.account_type + " A/c";
  document.getElementById("kpiAccountNo").textContent = "A/c " + customer.account_number_masked;
  document.getElementById("kpiTx").textContent = customer.total_transactions.toLocaleString("en-IN");
  document.getElementById("kpiTxSub").textContent = customer.monthly_transactions + " this month";
  document.getElementById("kpiOpenDisputes").textContent = customer.open_disputes;
  document.getElementById("kpiResolvedDisputes").textContent = customer.resolved_disputes + " resolved";
  document.getElementById("kpiRiskLevel").textContent = customer.risk_level;
  document.getElementById("kpiRiskScore").textContent = "Score: " + customer.risk_score + "/100";

  const riskColor = { Low: "icon-green", Medium: "icon-amber", High: "icon-orange", "Very High": "icon-red" };
  const riskCard = document.getElementById("kpiRiskLevel").closest(".kpi-card").querySelector(".icon");
  riskCard.className = "icon " + (riskColor[customer.risk_level] || "icon-amber");

  /* -------- Accounts panel -------- */
  const accountsList = document.getElementById("accountsList");
  accountsList.innerHTML = `
    <div style="border:1px solid var(--border); border-radius:12px; padding:14px; display:flex; flex-direction:column; gap:10px;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div>
          <div style="font-weight:700; font-size:13.5px;">${customer.account_type} Account</div>
          <div style="font-size:11.5px; color:var(--ink-500); margin-top:2px;">A/c No. ${customer.account_number_masked}</div>
        </div>
        <span class="badge ${customer.customer_status === 'Active' ? 'green' : 'gray'}">${customer.customer_status}</span>
      </div>
      <div>
        <div style="font-size:11px; color:var(--ink-500);">Available Balance</div>
        <div style="font-family:var(--font-display); font-size:19px; font-weight:700;">${fmtINR(customer.balance)}</div>
      </div>
      <div style="display:flex; justify-content:space-between; font-size:11.5px; color:var(--ink-500);">
        <span>KYC: <b style="color:var(--ink-900);">${customer.kyc_status}</b></span>
        <span>Opened ${fmtDate(customer.account_opened_date)}</span>
      </div>
    </div>
    <div style="margin-top:12px; font-size:11.5px; color:var(--ink-500); line-height:1.6;">
      <div><b style="color:var(--ink-900);">${customer.occupation}</b> · ${customer.city}, ${customer.state}</div>
      <div>${customer.email}</div>
      <div>${customer.mobile}</div>
    </div>`;

  /* -------- Recent transactions table -------- */
  const txBody = document.getElementById("txTableBody");
  const recent = customerTransactions.slice(0, 5);
  if (recent.length === 0) {
    txBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--ink-500); padding:24px;">No transactions on record.</td></tr>`;
  } else {
    txBody.innerHTML = recent.map(t => `
      <tr>
        <td>${fmtDate(t.date)}</td>
        <td>${t.type}</td>
        <td>${t.merchant !== "N/A" ? t.merchant : t.beneficiary}</td>
        <td class="amount-out">-${fmtINR(t.amount)}</td>
        <td><span class="badge ${statusBadge(t.status)}">${t.status}</span></td>
      </tr>`).join("");
  }

  function statusBadge(status) {
    if (status === "Completed") return "green";
    if (status === "Flagged") return "red";
    if (status === "Under Review") return "amber";
    if (status === "Declined") return "gray";
    return "gray";
  }

  /* -------- Spending overview chart -------- */
  const buckets = { Shopping: 0, "Bills & Utilities": 0, Transfers: 0, Others: 0 };
  const typeMap = {
    "Online Purchase": "Shopping", "POS Purchase": "Shopping",
    "Bill Payment": "Bills & Utilities", "Recharge": "Bills & Utilities",
    "NEFT": "Transfers", "IMPS": "Transfers", "RTGS": "Transfers", "UPI": "Transfers",
    "ATM Withdrawal": "Others"
  };
  const top10 = customerTransactions.slice(0, 10);
  top10.forEach(t => { buckets[typeMap[t.type] || "Others"] += t.amount; });
  const bucketColors = { Shopping: "#7c5cff", "Bills & Utilities": "#3b82f6", Transfers: "#17a06a", Others: "#e0662f" };
  const total = Object.values(buckets).reduce((a, b) => a + b, 0) || 1;

  const legend = document.getElementById("spendingLegend");
  legend.innerHTML = Object.entries(buckets).map(([k, v]) => `
    <div class="item">
      <span class="swatch" style="background:${bucketColors[k]}"></span>
      <span>${k}</span>
      <b>${fmtINR(v)}</b><span class="pct">(${Math.round(v / total * 100)}%)</span>
    </div>`).join("");

  if (window.Chart) {
    new Chart(document.getElementById("spendingChart"), {
      type: "doughnut",
      data: {
        labels: Object.keys(buckets),
        datasets: [{ data: Object.values(buckets), backgroundColor: Object.values(bucketColors), borderWidth: 0 }]
      },
      options: {
        cutout: "68%",
        plugins: { legend: { display: false } }
      }
    });
  }

  /* -------- Disputes panel (synthesized from customer profile + recent tx) -------- */
  const disputeBody = document.getElementById("disputeTableBody");
  const noDisputes = document.getElementById("noDisputes");
  const disputeCountTotal = customer.total_disputes;

  if (disputeCountTotal === 0) {
    document.querySelector("#disputeTableBody").closest(".table-wrap").style.display = "none";
    noDisputes.style.display = "block";
  } else {
    const reasons = ["Unauthorized Transaction", "Wrong Amount", "Duplicate Transaction", "Failed Transaction"];
    const flagged = customerTransactions.filter(t => t.status === "Flagged" || t.status === "Under Review");
    const source = (flagged.length ? flagged : customerTransactions).slice(0, Math.max(1, Math.min(4, disputeCountTotal)));
    disputeBody.innerHTML = source.map((t, i) => {
      const resolved = i < customer.resolved_disputes;
      const status = resolved ? "Resolved" : (i === 0 ? "Under Review" : "Pending");
      return `<tr>
        <td class="mono">DISP_${customer.customer_id.slice(-4)}${i}</td>
        <td>${reasons[i % reasons.length]}</td>
        <td>${fmtINR(t.amount)}</td>
        <td><span class="badge ${resolved ? "green" : (status === "Under Review" ? "amber" : "orange")}">${status}</span></td>
      </tr>`;
    }).join("");
  }

  /* -------- Security & alerts -------- */
  const securityList = document.getElementById("securityList");
  const flags = [];
  const latestTx = customerTransactions[0];
  if (latestTx) {
    if (latestTx.is_new_device) flags.push({ icon: "device", title: "New device logged in", sub: `${latestTx.location} · ${fmtDate(latestTx.date)}`, tone: "amber" });
    if (latestTx.location_mismatch) flags.push({ icon: "location", title: "Location mismatch detected", sub: `Login from ${latestTx.location}`, tone: "orange" });
    if (latestTx.is_new_beneficiary) flags.push({ icon: "beneficiary", title: "Payment to a new beneficiary", sub: `${fmtINR(latestTx.amount)} · ${fmtDate(latestTx.date)}`, tone: "amber" });
    if (latestTx.is_unusual_time) flags.push({ icon: "time", title: "Transaction at an unusual hour", sub: `${latestTx.time} · ${fmtDate(latestTx.date)}`, tone: "amber" });
  }
  if (flags.length === 0) {
    flags.push({ icon: "shield", title: "No suspicious activity found", sub: "Your account is secure", tone: "green" });
  }
  const icons = {
    shield: `<path d="M12 2l8 3v6c0 5-3.4 8.8-8 11-4.6-2.2-8-6-8-11V5l8-3z"/>`,
    device: `<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>`,
    location: `<path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 1118 0z"/><circle cx="12" cy="10" r="3"/>`,
    beneficiary: `<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>`,
    time: `<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>`
  };
  const toneClass = { green: "green", amber: "amber", orange: "orange" };
  securityList.innerHTML = flags.map(f => `
    <div style="display:flex; gap:10px; align-items:flex-start;">
      <div class="icon icon-${f.tone === 'green' ? 'green' : (f.tone === 'orange' ? 'orange' : 'amber')}" style="width:32px;height:32px;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px;">${icons[f.icon]}</svg>
      </div>
      <div>
        <div style="font-size:12.5px; font-weight:700;">${f.title}</div>
        <div style="font-size:11.5px; color:var(--ink-500); margin-top:2px;">${f.sub}</div>
      </div>
    </div>`).join("");
})();
