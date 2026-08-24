/* ============================================================
   AEGIS BANK — Global Search
   Searches DB.customers, DB.accounts, DB.transactions, and
   DB.disputes (all CSV-derived) and renders a dropdown of
   matching records that link straight to their detail page.
   ============================================================ */
(function () {
  const input = document.getElementById("globalSearchInput");
  const results = document.getElementById("globalSearchResults");
  if (!input || !results || typeof DB === "undefined") return;

  function esc(s) { return String(s == null ? "" : s); }

  function search(q) {
    q = q.trim().toLowerCase();
    if (q.length < 2) return [];
    const out = [];

    for (const c of DB.customers) {
      if (out.length >= 20) break;
      const hay = `${c.full_name} ${c.customer_id} ${c.email} ${c.city}`.toLowerCase();
      if (hay.includes(q)) out.push({ type: "Customer", title: c.full_name, sub: `${c.customer_id} · ${c.city}`, href: `customer-details.html?id=${c.customer_id}` });
    }
    for (const a of DB.accounts) {
      if (out.length >= 20) break;
      const hay = `${a.account_id} ${a.account_number_masked} ${a.customer_name}`.toLowerCase();
      if (hay.includes(q)) out.push({ type: "Account", title: a.account_number_masked, sub: `${a.account_type} · ${a.customer_name}`, href: `customer-details.html?id=${a.customer_id}` });
    }
    for (const t of DB.transactions) {
      if (out.length >= 20) break;
      const hay = `${t.id} ${t.customer_id} ${t.merchant} ${t.beneficiary}`.toLowerCase();
      if (hay.includes(q)) out.push({ type: "Transaction", title: t.id, sub: `₹${Number(t.amount).toLocaleString("en-IN")} · ${t.customer_id}`, href: `transaction-details.html?id=${t.id}` });
    }
    for (const d of DB.disputes) {
      if (out.length >= 20) break;
      const hay = `${d.customer_id} ${d.customer_name}`.toLowerCase();
      if (hay.includes(q)) out.push({ type: "Dispute", title: `${d.customer_name} · ${d.open} open`, sub: `${d.customer_id} · ${d.total} total disputes`, href: `customer-details.html?id=${d.customer_id}` });
    }
    return out.slice(0, 12);
  }

  const typeBadge = { Customer: "violet", Account: "blue", Transaction: "green", Dispute: "amber" };

  function render(items, q) {
    if (!q) { results.classList.remove("show"); results.innerHTML = ""; return; }
    if (items.length === 0) {
      results.innerHTML = `<div class="gs-empty">No matches for "${esc(q)}"</div>`;
    } else {
      results.innerHTML = items.map(i => `
        <a class="gs-item" href="${i.href}">
          <span class="badge ${typeBadge[i.type] || "gray"}" style="padding:2px 7px; font-size:10px;">${i.type}</span>
          <span class="gs-text"><b>${esc(i.title)}</b><span>${esc(i.sub)}</span></span>
        </a>`).join("");
    }
    results.classList.add("show");
  }

  let debounce;
  input.addEventListener("input", () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => render(search(input.value), input.value.trim()), 120);
  });
  input.addEventListener("focus", () => { if (input.value.trim()) render(search(input.value), input.value.trim()); });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-box")) results.classList.remove("show");
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { results.classList.remove("show"); input.blur(); }
  });
})();
