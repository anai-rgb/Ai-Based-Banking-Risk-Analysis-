/* ============================================================
   AEGIS BANK — List Page controller
   One generic engine for search + filter + sort + pagination +
   row rendering, reused by every directory-style page (Accounts,
   Transactions, Disputes, Alerts, Suspicious Detection, etc.)
   so each page only has to supply data + column config.
   ============================================================ */
function createListPage(opts) {
  const {
    data,                         // full array of rows
    pageSize = 25,
    searchFields = [],            // array of field names (dot-path ok) to match against search text
    filters = [],                 // [{ elId, field, transform? }]
    sortSelectId = null,
    sortFns = {},                 // { optionValue: (a,b)=>number }
    defaultSort = null,
    searchInputId = "searchInput",
    bodyId,
    countId,
    paginationId,
    columns,                      // [{ render(row) => html string }]
    colSpan,
    rowAttrs,                     // row => string of extra html attrs (e.g. onclick)
    emptyMessage = "No records match your filters.",
    onAfterRender,
  } = opts;

  let currentPage = 1;

  function getVal(obj, path) {
    return path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
  }

  function getFiltered() {
    const searchEl = searchInputId ? document.getElementById(searchInputId) : null;
    const q = searchEl ? searchEl.value.trim().toLowerCase() : "";

    let rows = data.filter(row => {
      for (const f of filters) {
        const el = document.getElementById(f.elId);
        if (!el || !el.value) continue;
        const val = f.transform ? f.transform(getVal(row, f.field)) : getVal(row, f.field);
        if (String(val) !== String(el.value)) return false;
      }
      if (q) {
        const hay = searchFields.map(f => String(getVal(row, f) ?? "")).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const sortEl = sortSelectId ? document.getElementById(sortSelectId) : null;
    const sortKey = sortEl ? sortEl.value : defaultSort;
    if (sortKey && sortFns[sortKey]) rows = rows.slice().sort(sortFns[sortKey]);

    return rows;
  }

  function render() {
    const rows = getFiltered();
    const countEl = document.getElementById(countId);
    if (countEl) countEl.textContent = `${rows.length.toLocaleString("en-IN")} result${rows.length === 1 ? "" : "s"}`;

    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    currentPage = Math.min(currentPage, totalPages);
    const start = (currentPage - 1) * pageSize;
    const pageRows = rows.slice(start, start + pageSize);

    const body = document.getElementById(bodyId);
    if (pageRows.length === 0) {
      body.innerHTML = `<tr><td colspan="${colSpan}"><div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:block;margin:0 auto 8px;"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
        ${emptyMessage}</div></td></tr>`;
    } else {
      body.innerHTML = pageRows.map(row => `
        <tr class="clickable" ${rowAttrs ? rowAttrs(row) : ""}>
          ${columns.map(c => `<td>${c.render(row)}</td>`).join("")}
        </tr>`).join("");
    }

    renderPagination(totalPages);
    // Pass just the rows actually rendered on this page — callers that need
    // the full filtered set already have getFiltered()/render() available,
    // and passing thousands of rows here invites accidental O(n) or worse
    // work (e.g. localStorage writes) per call.
    if (onAfterRender) onAfterRender(pageRows);
  }

  function renderPagination(totalPages) {
    const el = document.getElementById(paginationId);
    if (!el) return;
    if (totalPages <= 1) { el.innerHTML = ""; return; }
    let html = `<button ${currentPage === 1 ? "disabled" : ""} data-p="${currentPage - 1}">&larr;</button>`;
    const pages = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
    let prev = 0;
    [...pages].filter(p => p >= 1 && p <= totalPages).sort((a, b) => a - b).forEach(p => {
      if (prev && p - prev > 1) html += `<span class="gap">…</span>`;
      html += `<button class="${p === currentPage ? "active" : ""}" data-p="${p}">${p}</button>`;
      prev = p;
    });
    html += `<button ${currentPage === totalPages ? "disabled" : ""} data-p="${currentPage + 1}">&rarr;</button>`;
    el.innerHTML = html;
    el.querySelectorAll("button[data-p]").forEach(btn => {
      btn.addEventListener("click", () => { currentPage = parseInt(btn.dataset.p, 10); render(); window.scrollTo({ top: 0, behavior: "smooth" }); });
    });
  }

  const searchEl = searchInputId ? document.getElementById(searchInputId) : null;
  if (searchEl) searchEl.addEventListener("input", () => { currentPage = 1; render(); });
  filters.forEach(f => {
    const el = document.getElementById(f.elId);
    if (el) el.addEventListener("change", () => { currentPage = 1; render(); });
  });
  if (sortSelectId) {
    const el = document.getElementById(sortSelectId);
    if (el) el.addEventListener("change", () => { currentPage = 1; render(); });
  }

  render();
  return { render, goToPage: (p) => { currentPage = p; render(); } };
}
