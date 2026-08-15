/* Brands table (P2) — annual brand revenue, share %, YoY.
 *
 * Grain: brand exists only as an ANNUAL partner share (brand_share x partner YTD).
 * So this view is annual by construction:
 *  - Month / week filters do NOT apply (annual-only note, D-04/D-07).
 *  - Global rep filter subsets the partner pool honestly.
 *  - Global brand dropdown does NOT subset this table (it IS the brand breakdown);
 *    the selected brand row is highlighted instead. Documented skip (handoff P2).
 * 2025 uses the same annual share applied to 2025 revenue (consistent D-04 heuristic).
 */

const BRANDS_UI = { sortKey: "v26", sortDir: "desc", query: "" };

function brandsRows(state) {
  const totals = {};
  DATA.brands.forEach((b) => (totals[b.id] = { v26: 0, v25: 0 }));
  for (const p of DATA.partners) {
    if (state.rep && p.rep_id !== state.rep) continue;
    const y26 = p.monthly.m26.reduce((a, x) => a + x, 0);
    const y25 = p.monthly.m25.reduce((a, x) => a + x, 0);
    for (const b of DATA.brands) {
      const sh = p.brand_share[b.id] || 0;
      totals[b.id].v26 += y26 * sh;
      totals[b.id].v25 += y25 * sh;
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
    { key: "v26", label: "2026 (annual)", numeric: true, format: (r) => fmtMoney(r.v26) },
    { key: "share", label: "Share", numeric: true, format: (r) => (r.share * 100).toFixed(1) + "%" },
    { key: "v25", label: "2025 (annual)", numeric: true, format: (r) => fmtMoney(r.v25) },
    { key: "yoy", label: "YoY", numeric: true, format: (r) => (r.yoy === null ? "—" : `<span class="delta ${r.yoy >= 0 ? "pos" : "neg"}">${fmtPct(r.yoy)}</span>`) },
  ];
  const infoNote = `<div class="note"><strong>Annual view.</strong> Brand revenue is derived from each partner's annual brand share; month &amp; week filters do not apply, and the global brand dropdown highlights (does not filter) a row here (D-04).</div>`;
  panel.innerHTML = infoNote;
  panel.appendChild(buildDataTable({
    columns,
    rows: brandsRows(state),
    ui: BRANDS_UI,
    rowClass: (r) => (state.brand && r.id === state.brand ? "row-hl" : ""),
  }));
}

registerTab({ id: "brands", label: "Brands" }, renderBrands);
