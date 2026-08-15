/* Partners table (P2) — searchable partner list with 2026 / 2025 / YoY / plan.
 *
 * Grain: partner x month exists -> honest month slicing.
 *  - Search by name or id (client-side).
 *  - Global rep filter subsets rows; global brand filter applies annual share
 *    proportionally to the period figures (D-04 note).
 *  - Week filter not applied on the monthly grain (D-07 note).
 */

const PARTNERS_UI = { sortKey: "v26", sortDir: "desc", query: "" };

function partnersRows(state) {
  const idx = selectedMonthIndexes();
  const brand = state.brand;
  const rows = [];
  for (const p of DATA.partners) {
    if (state.rep && p.rep_id !== state.rep) continue;
    const sh = brand ? (p.brand_share[brand] || 0) : 1;
    const v26 = sumMonths(p.monthly.m26, idx) * sh;
    const v25 = sumMonths(p.monthly.m25, idx) * sh;
    const plan = p.plan_annual * sh;
    rows.push({
      id: p.id, name: p.name, county: p.county_name, rep: p.rep_label,
      v26, v25, plan,
      yoy: v25 ? v26 / v25 - 1 : null,
      attain: plan ? v26 / plan : null,
    });
  }
  return rows;
}

function renderPartners(state, panel) {
  const columns = [
    { key: "id", label: "ID" },
    { key: "name", label: "Partner" },
    { key: "county", label: "County" },
    { key: "rep", label: "Rep" },
    { key: "v26", label: "2026", numeric: true, format: (r) => fmtMoney(r.v26) },
    { key: "v25", label: "2025", numeric: true, format: (r) => fmtMoney(r.v25) },
    { key: "yoy", label: "YoY", numeric: true, format: (r) => (r.yoy === null ? "—" : `<span class="delta ${r.yoy >= 0 ? "pos" : "neg"}">${fmtPct(r.yoy)}</span>`) },
    { key: "attain", label: "Plan", numeric: true, format: (r) => (r.attain === null ? "—" : (r.attain * 100).toFixed(0) + "%") },
  ];
  panel.innerHTML = brandNote(state, "period") + weekNote(state);
  panel.appendChild(buildDataTable({
    columns,
    rows: partnersRows(state),
    ui: PARTNERS_UI,
    search: { placeholder: "Search name or ID…", fields: ["name", "id"] },
  }));
}

registerTab({ id: "partners", label: "Partners" }, renderPartners);
