/* ============================================================
   AEGIS BANK — Charts Lite
   Zero-dependency SVG chart renderer. No CDN, no external
   library — so charts never render blank even if a network
   request fails. Covers: donut, multi-line, and bar charts.
   ============================================================ */
const ChartsLite = (function () {

  function el(tag, attrs) {
    const e = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  function emptyState(container, message) {
    container.innerHTML = `<div style="display:flex; align-items:center; justify-content:center; height:100%; min-height:160px; color:var(--ink-500); font-size:12.5px; text-align:center; padding:20px;">${message || "No data available for this chart."}</div>`;
  }

  /* ---------------- DONUT ---------------- */
  function donut(container, { data, colors, size = 190, thickness = 26, onHover, onClick }) {
    container.innerHTML = "";
    const entries = Object.entries(data || {}).filter(([, v]) => v > 0);
    const total = entries.reduce((a, [, v]) => a + v, 0);
    if (!entries.length || total === 0) return emptyState(container, "No data available for this chart.");

    const svg = el("svg", { viewBox: `0 0 ${size} ${size}`, width: "100%", height: size, style: "overflow:visible" });
    const r = (size - thickness) / 2;
    const cx = size / 2, cy = size / 2;
    let startAngle = -90;

    const tooltip = document.createElement("div");
    tooltip.style.cssText = "position:absolute; pointer-events:none; background:var(--navy-950); color:#fff; font-size:11.5px; padding:6px 10px; border-radius:7px; opacity:0; transition:opacity .1s; z-index:20; white-space:nowrap;";
    container.style.position = "relative";

    entries.forEach(([label, value]) => {
      const frac = value / total;
      const angle = frac * 360;
      const endAngle = startAngle + angle;
      const largeArc = angle > 180 ? 1 : 0;
      const x1 = cx + r * Math.cos(startAngle * Math.PI / 180);
      const y1 = cy + r * Math.sin(startAngle * Math.PI / 180);
      const x2 = cx + r * Math.cos(endAngle * Math.PI / 180);
      const y2 = cy + r * Math.sin(endAngle * Math.PI / 180);
      const path = el("path", {
        d: `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
        fill: "none",
        stroke: (colors && colors[label]) || "#7c5cff",
        "stroke-width": thickness,
        "stroke-linecap": entries.length > 1 ? "butt" : "round",
        style: "cursor:pointer; transition: opacity .15s;"
      });
      path.addEventListener("mouseenter", (e) => {
        path.style.opacity = "0.75";
        tooltip.innerHTML = `<b>${label}</b>: ${value.toLocaleString("en-IN")} (${(frac * 100).toFixed(1)}%)`;
        tooltip.style.opacity = "1";
        if (onHover) onHover(label, value);
      });
      path.addEventListener("mousemove", (e) => {
        const rect = container.getBoundingClientRect();
        tooltip.style.left = (e.clientX - rect.left + 12) + "px";
        tooltip.style.top = (e.clientY - rect.top - 8) + "px";
      });
      path.addEventListener("mouseleave", () => { path.style.opacity = "1"; tooltip.style.opacity = "0"; });
      if (onClick) path.addEventListener("click", () => onClick(label, value));
      svg.appendChild(path);
      startAngle = endAngle;
    });

    const centerText = el("text", { x: cx, y: cy - 4, "text-anchor": "middle", "font-size": "20", "font-weight": "700", fill: "var(--navy-950)", "font-family": "var(--font-display)" });
    centerText.textContent = total.toLocaleString("en-IN");
    const centerLabel = el("text", { x: cx, y: cy + 14, "text-anchor": "middle", "font-size": "10", fill: "var(--ink-500)" });
    centerLabel.textContent = "total";
    svg.appendChild(centerText);
    svg.appendChild(centerLabel);

    container.appendChild(svg);
    container.appendChild(tooltip);
  }

  /* ---------------- MULTI-LINE ---------------- */
  function line(container, { labels, series, colors, height = 190 }) {
    container.innerHTML = "";
    if (!labels || !labels.length || !series || !series.length) return emptyState(container, "No data available for this chart.");

    const width = Math.max(container.clientWidth || 480, 320);
    const padL = 38, padR = 14, padT = 14, padB = 26;
    const plotW = width - padL - padR, plotH = height - padT - padB;

    const allVals = series.flatMap(s => s.data);
    const maxVal = Math.max(1, ...allVals);
    const niceMax = Math.ceil(maxVal / 5) * 5 || 5;

    const svg = el("svg", { viewBox: `0 0 ${width} ${height}`, width: "100%", height, style: "overflow:visible" });

    // gridlines + y labels
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const y = padT + plotH - (plotH * i / steps);
      svg.appendChild(el("line", { x1: padL, x2: width - padR, y1: y, y2: y, stroke: "#f0f2f8", "stroke-width": 1 }));
      const val = Math.round(niceMax * i / steps);
      const t = el("text", { x: padL - 8, y: y + 3, "text-anchor": "end", "font-size": "9.5", fill: "var(--ink-500)" });
      t.textContent = val.toLocaleString("en-IN");
      svg.appendChild(t);
    }

    const xStep = labels.length > 1 ? plotW / (labels.length - 1) : plotW;
    labels.forEach((lab, i) => {
      const x = padL + xStep * i;
      const t = el("text", { x, y: height - 6, "text-anchor": "middle", "font-size": "9.5", fill: "var(--ink-500)" });
      t.textContent = lab;
      svg.appendChild(t);
    });

    const tooltip = document.createElement("div");
    tooltip.style.cssText = "position:absolute; pointer-events:none; background:var(--navy-950); color:#fff; font-size:11px; padding:6px 9px; border-radius:7px; opacity:0; transition:opacity .1s; z-index:20; white-space:nowrap;";
    container.style.position = "relative";

    series.forEach((s) => {
      const color = (colors && colors[s.label]) || "#7c5cff";
      let d = "";
      s.data.forEach((v, i) => {
        const x = padL + xStep * i;
        const y = padT + plotH - (plotH * v / niceMax);
        d += (i === 0 ? "M" : "L") + x + " " + y + " ";
      });
      svg.appendChild(el("path", { d, fill: "none", stroke: color, "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" }));

      s.data.forEach((v, i) => {
        const x = padL + xStep * i;
        const y = padT + plotH - (plotH * v / niceMax);
        const dot = el("circle", { cx: x, cy: y, r: 3, fill: color, stroke: "#fff", "stroke-width": 1.5, style: "cursor:pointer;" });
        dot.addEventListener("mouseenter", (e) => {
          tooltip.innerHTML = `<b>${s.label}</b> · ${labels[i]}: ${v.toLocaleString("en-IN")}`;
          tooltip.style.opacity = "1";
        });
        dot.addEventListener("mousemove", (e) => {
          const rect = container.getBoundingClientRect();
          tooltip.style.left = (e.clientX - rect.left + 12) + "px";
          tooltip.style.top = (e.clientY - rect.top - 8) + "px";
        });
        dot.addEventListener("mouseleave", () => tooltip.style.opacity = "0");
        svg.appendChild(dot);
      });
    });

    container.appendChild(svg);
    container.appendChild(tooltip);

    // legend
    if (series.length > 1) {
      const legend = document.createElement("div");
      legend.style.cssText = "display:flex; gap:14px; flex-wrap:wrap; justify-content:center; margin-top:8px;";
      legend.innerHTML = series.map(s => `<span style="font-size:11px; color:var(--ink-700); display:flex; align-items:center; gap:5px;"><span style="width:8px;height:8px;border-radius:50%;background:${(colors && colors[s.label]) || '#7c5cff'};display:inline-block;"></span>${s.label}</span>`).join("");
      container.appendChild(legend);
    }
  }

  /* ---------------- BAR ---------------- */
  function bar(container, { data, colors, height = 190, horizontal = false }) {
    container.innerHTML = "";
    const entries = Object.entries(data || {});
    if (!entries.length) return emptyState(container, "No data available for this chart.");
    const maxVal = Math.max(1, ...entries.map(([, v]) => v));

    const width = Math.max(container.clientWidth || 480, 320);
    const padL = horizontal ? 90 : 34, padR = 14, padT = 10, padB = horizontal ? 10 : 30;
    const plotW = width - padL - padR, plotH = height - padT - padB;

    const svg = el("svg", { viewBox: `0 0 ${width} ${height}`, width: "100%", height });
    const tooltip = document.createElement("div");
    tooltip.style.cssText = "position:absolute; pointer-events:none; background:var(--navy-950); color:#fff; font-size:11px; padding:6px 9px; border-radius:7px; opacity:0; transition:opacity .1s; z-index:20; white-space:nowrap;";
    container.style.position = "relative";

    if (horizontal) {
      const bh = Math.min(26, plotH / entries.length - 8);
      entries.forEach(([label, value], i) => {
        const y = padT + i * (plotH / entries.length) + (plotH / entries.length - bh) / 2;
        const w = (value / maxVal) * plotW;
        const t = el("text", { x: padL - 8, y: y + bh / 2 + 4, "text-anchor": "end", "font-size": "10.5", fill: "var(--ink-700)" });
        t.textContent = label;
        svg.appendChild(t);
        const r = el("rect", { x: padL, y, width: Math.max(2, w), height: bh, rx: 5, fill: (colors && colors[label]) || "#7c5cff", style: "cursor:pointer;" });
        r.addEventListener("mouseenter", () => { tooltip.innerHTML = `<b>${label}</b>: ${value.toLocaleString("en-IN")}`; tooltip.style.opacity = "1"; });
        r.addEventListener("mousemove", (e) => { const rect = container.getBoundingClientRect(); tooltip.style.left = (e.clientX - rect.left + 12) + "px"; tooltip.style.top = (e.clientY - rect.top - 8) + "px"; });
        r.addEventListener("mouseleave", () => tooltip.style.opacity = "0");
        svg.appendChild(r);
      });
    } else {
      const bw = Math.min(46, plotW / entries.length - 12);
      entries.forEach(([label, value], i) => {
        const x = padL + i * (plotW / entries.length) + (plotW / entries.length - bw) / 2;
        const h = (value / maxVal) * plotH;
        const y = padT + plotH - h;
        const r = el("rect", { x, y, width: bw, height: Math.max(2, h), rx: 5, fill: (colors && colors[label]) || "#7c5cff", style: "cursor:pointer;" });
        r.addEventListener("mouseenter", () => { tooltip.innerHTML = `<b>${label}</b>: ${value.toLocaleString("en-IN")}`; tooltip.style.opacity = "1"; });
        r.addEventListener("mousemove", (e) => { const rect = container.getBoundingClientRect(); tooltip.style.left = (e.clientX - rect.left + 12) + "px"; tooltip.style.top = (e.clientY - rect.top - 8) + "px"; });
        r.addEventListener("mouseleave", () => tooltip.style.opacity = "0");
        svg.appendChild(r);
        const t = el("text", { x: x + bw / 2, y: height - 10, "text-anchor": "middle", "font-size": "9.5", fill: "var(--ink-500)" });
        t.textContent = label;
        svg.appendChild(t);
      });
    }

    container.appendChild(svg);
    container.appendChild(tooltip);
  }

  return { donut, line, bar, emptyState };
})();
