/* Reps table (P2) — 2026 / 2025 / YoY / plan attainment per rep.
 *
 * Grain: rep is a partner attribute; partner x month exists -> honest month slicing.
 *  - Month filter: sums selected months.  - Global rep filter: subsets to that rep.
 *  - Brand filter: partner × brand × month (monthly_brand) — honest, no heuristic.
 *    Plan attainment is hidden while a brand is selected (plan has no brand split).
 *  - Week filter: not applied on the monthly grain; weeks drive the map (D-03 note).
 */

const REPS_UI = { sortKey: "v26", sortDir: "desc", query: "" };

function repsRows(state) {
  const idx = selectedMonthIndexes();
  const brand = state.brand;
  const rows = [];
  for (const rep of DATA.reps) {
    if (state.rep && rep.id !== state.rep) continue;
    let v26 = 0, v25 = 0, plan = 0, n = 0;
    for (const p of DATA.partners) {
      if (p.rep_id !== rep.id) continue;
      n++;
      const per = partnerMonthsSum(p, brand, idx); // brand×month grain when brand set
      v26 += per.v26; v25 += per.v25;
      plan += p.plan_annual; // annual, all-brand
    }
    rows.push({
      rep: rep.label, partners: n, v26, v25, plan,
      yoy: v25 ? v26 / v25 - 1 : null,
      attain: (plan && !brand) ? v26 / plan : null, // plan not split by brand
    });
  }
  return rows;
}

function yoyCell(r) {
  if (r.yoy === null) return "—";
  return `<span class="delta ${r.yoy >= 0 ? "pos" : "neg"}">${fmtPct(r.yoy)}</span>`;
}

function renderReps(state, panel) {
  const columns = [
    { key: "rep", label: "Rep" },
    { key: "partners", label: "Partners", numeric: true },
    { key: "v26", label: "2026", numeric: true, format: (r) => fmtMoney(r.v26) },
    { key: "v25", label: "2025", numeric: true, format: (r) => fmtMoney(r.v25) },
    { key: "yoy", label: "YoY", numeric: true, format: yoyCell },
    { key: "attain", label: "Plan", numeric: true, format: (r) => (r.attain === null ? "—" : (r.attain * 100).toFixed(0) + "%") },
  ];
  panel.innerHTML = brandFilterNote(state) + weekNote(state);
  panel.appendChild(buildDataTable({ columns, rows: repsRows(state), ui: REPS_UI }));
}

registerTab({ id: "reps", label: "Reps" }, renderReps);
