/* Brands table (P2, rewired v0.3.2) — brand revenue, share %, YoY.
 *
 * Grain: partner × brand × month (monthly_brand) — honest period slicing.
 *  - Month filter applies; weeks drive the Counties map (D-03).
 *  - Global rep filter subsets the partner pool.
 *  - Global brand dropdown does NOT subset this table (it IS the brand breakdown);
 *    the selected brand row is highlighted instead. Documented skip (handoff P2).
 */

const BRANDS_UI = { sortKey: "v26", sortDir: "desc", query: "" };

function brandsRows(state) {
  const idx = selectedMonthIndexes();
  const totals = {};
  DATA.brands.forEach((b) => (totals[b.id] = { v26: 0, v25: 0 }));
  for (const p of DATA.partners) {
    if (state.rep && p.rep_id !== state.rep) continue;
    for (const b of DATA.brands) {
      const mb = p.monthly_brand[b.id]; // partner × brand × month
      for (const i of idx) { totals[b.id].v26 += mb.m26[i]; totals[b.id].v25 += mb.m25[i]; }
    }
  }
  const grand26 = DATA.brands.reduce((a, b) => a + totals[b.id].v26, 0) || 1;
  return DATA.brands.map((b) => {
    const t = totals[b.id];
    return {
      id: b.id, brand: b.name, v26: t.v26, v25: t.v25,
      share: t.v26 / grand26,
      yoy: t.v25 ? t.v26 / t.v25 - 1 : null,
    };
  });
}

function renderBrands(state, panel) {
  const columns = [
    { key: "brand", label: "Brand" },
    { key: "v26", label: "2026", numeric: true, format: (r) => fmtMoney(r.v26) },
    { key: "share", label: "Share", numeric: true, format: (r) => (r.share * 100).toFixed(1) + "%" },
    { key: "v25", label: "2025", numeric: true, format: (r) => fmtMoney(r.v25) },
    { key: "yoy", label: "YoY", numeric: true, format: (r) => (r.yoy === null ? "—" : `<span class="delta ${r.yoy >= 0 ? "pos" : "neg"}">${fmtPct(r.yoy)}</span>`) },
  ];
  const infoNote = `<div class="note"><strong>Brand breakdown.</strong> Revenue uses the brand×month grain and honors the month selection; the global brand dropdown highlights (does not filter) a row here. Weeks drive the Counties map (D-03).</div>`;
  panel.innerHTML = infoNote;
  panel.appendChild(buildDataTable({
    columns,
    rows: brandsRows(state),
    ui: BRANDS_UI,
    rowClass: (r) => (state.brand && r.id === state.brand ? "row-hl" : ""),
  }));
}

registerTab({ id: "brands", label: "Brands" }, renderBrands);
