/* Brand heatmap tab (P4) — brand chips recolor the HU county choropleth.
 *
 * Geometry: hu-counties-geo.js (shared with the Counties tab).
 *
 * One brand is active at a time (local chip state). The map colours each county by
 * that brand's revenue over the selected months, from county×brand×month
 * (monthly_by_brand) — a real grain (data-contract v0.3.2+), so this is period-aware
 * and honest, not the annual-only fallback the original P4 issue assumed (D-04 amended).
 * Weeks drive the Counties map (D-03), not this tab; a note shows if weeks ≠ all.
 */

const BH_STATE = { brand: null }; // set on first render
const BH_UI = { sortKey: "v26", sortDir: "desc", query: "" };

function bhCountyValue(county, brand, monthIdx) {
  const mb = county.monthly_by_brand[brand];
  let v = 0;
  for (const i of monthIdx) v += mb.m26[i];
  return v;
}

// Sequential blue scale (self-contained; mirrors the Counties magnitude ramp).
function bhColor(v, min, max) {
  const lo = [224, 237, 255], hi = [30, 58, 138];
  const t = (v - min) / (max - min || 1);
  const c = (a, b) => Math.round(a + (b - a) * t);
  return `rgb(${c(lo[0], hi[0])},${c(lo[1], hi[1])},${c(lo[2], hi[2])})`;
}

function bhCountyById(id) { return DATA.counties.find((c) => c.id === id) || null; }

function renderBrandHeatmap(state, panel) {
  if (!BH_STATE.brand) BH_STATE.brand = state.brand || DATA.brands[0].id;
  const brand = BH_STATE.brand;
  const bname = (DATA.brands.find((b) => b.id === brand) || {}).name || brand;
  const monthIdx = selectedMonthIndexes();
  const periodLbl = monthsAreDefault() ? "full year" : `${state.months.size} month${state.months.size > 1 ? "s" : ""}`;

  // Per-county value for the active brand + extent.
  const vals = {};
  for (const c of DATA.counties) vals[c.id] = bhCountyValue(c, brand, monthIdx);
  const nums = Object.values(vals);
  const min = Math.min(...nums), max = Math.max(...nums);

  // Chips
  const chips = DATA.brands.map((b) =>
    `<button class="bh-chip${b.id === brand ? " on" : ""}" data-brand="${b.id}">${b.name}</button>`
  ).join("");

  // Map
  const paths = HU_COUNTIES_GEO.map((g) => {
    const c = bhCountyById(g.id);
    const fill = c ? bhColor(vals[g.id], min, max) : "#e5e7eb";
    return `<path class="mg-county" data-id="${g.id}" d="${g.d}" fill="${fill}"><title>${c ? c.name : g.id}: ${fmtMoney(vals[g.id] || 0)}</title></path>`;
  }).join("");
  const labels = HU_COUNTIES_GEO.map((g) => `<text class="mg-label" x="${g.lx}" y="${g.ly}">${(bhCountyById(g.id) || {}).name || ""}</text>`).join("");
  const svg = `<svg viewBox="${HU_MAP_VIEWBOX}" class="mg-map" role="img" aria-label="County heatmap for ${bname}">
      <path class="mg-outline" d="${HU_MAP_OUTLINE}" />${paths}${labels}
    </svg>`;
  const legend = `<div class="mg-legend"><span>${fmtMoney(min)}</span><span class="mg-bar mg-bar-seq"></span><span>${fmtMoney(max)}</span></div>`;

  // Ranked county list for the active brand
  const rows = DATA.counties.map((c) => {
    const v = vals[c.id];
    let cTot = 0;
    for (const b of DATA.brands) cTot += bhCountyValue(c, b.id, monthIdx);
    return { name: c.name, v26: v, share: cTot ? v / cTot : 0 };
  });
  const columns = [
    { key: "name", label: "County" },
    { key: "v26", label: `${bname} 2026`, numeric: true, format: (r) => fmtMoney(r.v26) },
    { key: "share", label: "Share of county", numeric: true, format: (r) => (r.share * 100).toFixed(1) + "%" },
  ];

  const note = weeksAreDefault() ? "" : weekNote(state);
  panel.innerHTML = `${note}
    <div class="bh-head">
      <div class="bh-chips">${chips}</div>
      <span class="bh-sub">Choropleth: <strong>${bname}</strong> revenue by county &middot; ${periodLbl} &middot; county×brand×month grain</span>
    </div>`;
  const layout = el('<div class="mg-layout"></div>');
  const mapWrap = el('<div class="mg-map-wrap"></div>');
  mapWrap.innerHTML = svg + legend;
  const side = el('<div class="mg-table-side"></div>');
  side.appendChild(buildDataTable({ columns, rows, ui: BH_UI }));
  layout.append(mapWrap, side);
  panel.appendChild(layout);

  panel.querySelectorAll(".bh-chip").forEach((ch) => ch.addEventListener("click", () => {
    BH_STATE.brand = ch.dataset.brand;
    renderActiveTab();
  }));
}

registerTab({ id: "brand_heatmap", label: "Brand heatmap" }, renderBrandHeatmap);
