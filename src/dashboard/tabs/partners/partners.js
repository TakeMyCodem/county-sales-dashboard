/* Partners table (P2) — searchable partner list with 2026 / 2025 / YoY / plan.
 *
 * Grain: partner x month exists -> honest month slicing.
 *  - Search by name or id (client-side).
 *  - Global rep filter subsets rows; global brand filter uses partner × brand ×
 *    month (monthly_brand) — honest, no heuristic. Plan attainment hidden with a brand.
 *  - Week filter not applied on the monthly grain; weeks drive the map (D-03 note).
 */

const PARTNERS_UI = { sortKey: "v26", sortDir: "desc", query: "" };

function partnersRows(state) {
  const idx = selectedMonthIndexes();
  const brand = state.brand;
  const rows = [];
  for (const p of DATA.partners) {
    if (state.rep && p.rep_id !== state.rep) continue;
    const { v26, v25 } = partnerMonthsSum(p, brand, idx); // brand×month grain when brand set
    const plan = p.plan_annual; // annual, all-brand
    rows.push({
      id: p.id, name: p.name, county: p.county_name, rep: p.rep_label,
      v26, v25, plan,
      yoy: v25 ? v26 / v25 - 1 : null,
      attain: (plan && !brand) ? v26 / plan : null, // plan not split by brand
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
  panel.innerHTML = brandFilterNote(state) + weekNote(state);
  panel.appendChild(buildDataTable({
    columns,
    rows: partnersRows(state),
    ui: PARTNERS_UI,
    search: { placeholder: "Search name or ID…", fields: ["name", "id"] },
  }));
}

registerTab({ id: "partners", label: "Partners" }, renderPartners);
