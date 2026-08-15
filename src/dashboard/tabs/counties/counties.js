/* Counties tab (P3) — reactive HU county map + county table + drill.
 *
 * Geometry: hu-counties-geo.js (loaded before this module).
 *
 * Map paint (docs/decisions.md D-03, data-contract v0.3.2+ grains):
 *  - Map-local Month|Week XOR toggle picks WHICH global Set slices the map. The
 *    global bar stays dual (both Sets live); the toggle does not clear them.
 *  - Period subset (chosen kind ≠ all) -> period YoY (diverging); else 2026
 *    magnitude (sequential).
 *  - Rep active -> honest period source: month uses county×rep×month
 *    (monthly_by_rep); week rolls partner weekly up to county for that rep.
 *  - Brand does NOT recolor the map (that's the Brand heatmap tab, P4); a note is
 *    shown, and county brand mix appears in the drill.
 *
 * Drill (county click): period-aware KPI + brand cards (county×brand×month, or
 * partner rollup when rep/week) + rep chips with county-local share % + partners.
 */

const MAP_STATE = { kind: "month" };            // 'month' | 'week'
const DRILL = { countyId: null, localRep: null };
const COUNTY_UI = { sortKey: "v26", sortDir: "desc", query: "" };

let _partnersByCounty = null;
function partnersByCounty(cid) {
  if (!_partnersByCounty) {
    _partnersByCounty = {};
    for (const p of DATA.partners) (_partnersByCounty[p.county_id] ||= []).push(p);
  }
  return _partnersByCounty[cid] || [];
}
function countyById(id) { return DATA.counties.find((c) => c.id === id) || null; }

function selectedWeekIndexes() {
  const idx = [];
  ALL_WEEKS.forEach((w, i) => { if (STATE.weeks.has(w)) idx.push(i); });
  return idx;
}
function mapPeriodIsSubset() {
  return MAP_STATE.kind === "week" ? !weeksAreDefault() : !monthsAreDefault();
}

// County 2026/2025 for the current map period slice (respects global rep, honest grain).
function countyPeriod(county) {
  const rep = STATE.rep;
  let v26 = 0, v25 = 0;
  if (MAP_STATE.kind === "week") {
    const widx = selectedWeekIndexes();
    for (const p of partnersByCounty(county.id)) {
      if (rep && p.rep_id !== rep) continue;
      for (const i of widx) { v26 += p.weekly.w26[i]; v25 += p.weekly.w25[i]; }
    }
  } else {
    const midx = selectedMonthIndexes();
    const src = rep ? county.monthly_by_rep[rep] : county.monthly; // county×rep×month exists
    if (src) for (const i of midx) { v26 += src.m26[i]; v25 += src.m25[i]; }
  }
  return { v26, v25, yoy: v25 ? v26 / v25 - 1 : null };
}

// County 2026 revenue for one brand over the map period slice (honest grain).
function countyBrandPeriod(county, bid) {
  let v = 0;
  if (MAP_STATE.kind === "week") {
    const widx = selectedWeekIndexes();
    for (const p of partnersByCounty(county.id)) {
      if (STATE.rep && p.rep_id !== STATE.rep) continue;
      const wb = p.weekly_brand[bid];
      for (const i of widx) v += wb.w26[i];
    }
  } else {
    const midx = selectedMonthIndexes();
    if (STATE.rep) {
      for (const p of partnersByCounty(county.id)) {
        if (p.rep_id !== STATE.rep) continue;
        const mb = p.monthly_brand[bid];
        for (const i of midx) v += mb.m26[i];
      }
    } else {
      const mb = county.monthly_by_brand[bid]; // county×brand×month
      for (const i of midx) v += mb.m26[i];
    }
  }
  return v;
}

// County 2026 revenue for one rep over the map period slice.
function countyRepPeriod(county, rid) {
  let v = 0;
  if (MAP_STATE.kind === "week") {
    const widx = selectedWeekIndexes();
    for (const p of partnersByCounty(county.id)) {
      if (p.rep_id !== rid) continue;
      for (const i of widx) v += p.weekly.w26[i];
    }
  } else {
    const midx = selectedMonthIndexes();
    const src = county.monthly_by_rep[rid];
    if (src) for (const i of midx) v += src.m26[i];
  }
  return v;
}

function paintModel() {
  const subset = mapPeriodIsSubset();
  const mode = subset ? "yoy" : "ytd";
  const vals = {};
  for (const c of DATA.counties) {
    const per = countyPeriod(c);
    vals[c.id] = subset ? per.yoy : per.v26;
  }
  return { mode, vals };
}

/* ---- Colour scales ---- */
function _lerp(a, b, t) { return Math.round(a + (b - a) * t); }
function _mix(c1, c2, t) { return `rgb(${_lerp(c1[0], c2[0], t)},${_lerp(c1[1], c2[1], t)},${_lerp(c1[2], c2[2], t)})`; }
const SEQ_LO = [224, 237, 255], SEQ_HI = [30, 58, 138];
const DIV_NEG = [220, 38, 38], DIV_MID = [229, 231, 235], DIV_POS = [5, 150, 105];

function colorFor(mode, v, ext) {
  if (v === null || v === undefined || !isFinite(v)) return "#e5e7eb";
  if (mode === "yoy") {
    const m = ext.absMax || 1;
    const t = Math.max(-1, Math.min(1, v / m));
    return t < 0 ? _mix(DIV_MID, DIV_NEG, -t) : _mix(DIV_MID, DIV_POS, t);
  }
  const span = ext.max - ext.min || 1;
  return _mix(SEQ_LO, SEQ_HI, (v - ext.min) / span);
}
function extentOf(vals) {
  const nums = Object.values(vals).filter((x) => x !== null && isFinite(x));
  const min = Math.min(...nums), max = Math.max(...nums);
  return { min, max, absMax: Math.max(Math.abs(min), Math.abs(max)) };
}

/* ---- Rendering ---- */
function mapModeLabel(mode) {
  const base = mode === "yoy"
    ? `YoY % (${MAP_STATE.kind === "week" ? "selected weeks" : "selected months"})`
    : "2026 revenue (magnitude)";
  return STATE.rep ? `${base} · ${(DATA.reps.find((r) => r.id === STATE.rep) || {}).label || STATE.rep}` : base;
}

function renderMapSVG(model, ext) {
  const paths = HU_COUNTIES_GEO.map((g) => {
    const c = countyById(g.id);
    const fill = c ? colorFor(model.mode, model.vals[g.id], ext) : "#e5e7eb";
    const sel = DRILL.countyId === g.id ? " sel" : "";
    return `<path class="mg-county${sel}" data-id="${g.id}" d="${g.d}" fill="${fill}"><title>${c ? c.name : g.id}</title></path>`;
  }).join("");
  const labels = HU_COUNTIES_GEO.map((g) => `<text class="mg-label" x="${g.lx}" y="${g.ly}">${(countyById(g.id) || {}).name || ""}</text>`).join("");
  return `<svg viewBox="${HU_MAP_VIEWBOX}" class="mg-map" role="img" aria-label="Hungary counties map">
    <path class="mg-outline" d="${HU_MAP_OUTLINE}" />
    ${paths}
    ${labels}
  </svg>`;
}

function renderLegend(model, ext) {
  if (model.mode === "yoy") {
    return `<div class="mg-legend"><span>${fmtPct(-ext.absMax)}</span><span class="mg-bar mg-bar-div"></span><span>${fmtPct(ext.absMax)}</span></div>`;
  }
  return `<div class="mg-legend"><span>${fmtMoney(ext.min)}</span><span class="mg-bar mg-bar-seq"></span><span>${fmtMoney(ext.max)}</span></div>`;
}

function countyTable() {
  const rows = DATA.counties.map((c) => {
    const per = countyPeriod(c);
    return { id: c.id, name: c.name, partners: c.partner_count, v26: per.v26, yoy: per.yoy };
  });
  const columns = [
    { key: "name", label: "County" },
    { key: "partners", label: "Partners", numeric: true },
    { key: "v26", label: "2026", numeric: true, format: (r) => fmtMoney(r.v26) },
    { key: "yoy", label: "YoY", numeric: true, format: (r) => (r.yoy === null ? "—" : `<span class="delta ${r.yoy >= 0 ? "pos" : "neg"}">${fmtPct(r.yoy)}</span>`) },
  ];
  const tbl = buildDataTable({ columns, rows, ui: COUNTY_UI, rowClass: (r) => (DRILL.countyId === r.id ? "row-hl" : "") });
  tbl.addEventListener("click", (e) => {
    const tr = e.target.closest("tbody tr");
    if (!tr) return;
    const c = DATA.counties.find((x) => x.name === tr.firstElementChild.textContent);
    if (c) openDrill(c.id);
  });
  return tbl;
}

function renderDrill() {
  if (!DRILL.countyId) return el(`<div class="mg-drill mg-drill-empty">Click a county on the map or table to drill in.</div>`);
  const c = countyById(DRILL.countyId);
  const per = countyPeriod(c);
  const periodLbl = MAP_STATE.kind === "week" ? "sel. weeks" : "sel. months";
  const wrap = el('<div class="mg-drill"></div>');

  const kpi = `<div class="mg-drill-head"><h3>${c.name}</h3><button class="mg-drill-close" title="Close drill">✕</button></div>
    <div class="kpi-strip">
      <div class="kpi-card"><div class="kpi-label">2026 (${periodLbl})</div><div class="kpi-value">${fmtMoney(per.v26)}</div><div class="kpi-foot">${c.partner_count} partners${STATE.rep ? " · rep-filtered" : ""}</div></div>
      <div class="kpi-card"><div class="kpi-label">2025</div><div class="kpi-value">${fmtMoney(per.v25)}</div><div class="kpi-foot">same period</div></div>
      <div class="kpi-card"><div class="kpi-label">YoY</div><div class="kpi-value">${per.yoy === null ? "—" : `<span class="delta ${per.yoy >= 0 ? "pos" : "neg"}">${fmtPct(per.yoy)}</span>`}</div><div class="kpi-foot">2026 vs 2025</div></div>
    </div>`;

  // Brand cards — period-aware (honest grain)
  const brandVals = DATA.brands.map((b) => ({ b, v: countyBrandPeriod(c, b.id) }));
  const brandTotal = brandVals.reduce((a, x) => a + x.v, 0) || 1;
  const brandCards = brandVals.map(({ b, v }) => {
    const hl = STATE.brand === b.id ? " brand-hl" : "";
    return `<div class="brand-card${hl}"><div class="brand-name">${b.name}</div><div class="brand-val">${fmtMoney(v)}</div><div class="brand-share">${(v / brandTotal * 100).toFixed(1)}% of county</div></div>`;
  }).join("");
  const brandBlock = `<div class="mg-block-title">Brand mix <span class="mg-annual">${periodLbl}</span></div><div class="brand-cards">${brandCards}</div>`;

  // Rep chips — county-local share %, period-aware
  const repVals = Object.keys(c.by_rep).map((rid) => ({ rid, v: countyRepPeriod(c, rid) })).filter((x) => x.v > 0);
  const repSum = repVals.reduce((a, x) => a + x.v, 0) || 1;
  const chips = repVals.sort((a, b) => b.v - a.v).map(({ rid, v }) => {
    const label = (DATA.reps.find((r) => r.id === rid) || {}).label || rid;
    const on = DRILL.localRep === rid ? " on" : "";
    return `<button class="rep-chip${on}" data-rep="${rid}">${label} · ${(v / repSum * 100).toFixed(0)}%</button>`;
  }).join("");
  const chipBlock = `<div class="mg-block-title">Reps in county <span class="mg-annual">${periodLbl} share</span></div><div class="rep-chips">${chips || '<span class="mg-muted">No rep activity in this period.</span>'}</div>`;

  // Partner list — period-aware, respects global rep + local rep chip
  const midx = selectedMonthIndexes(), widx = selectedWeekIndexes();
  const prows = partnersByCounty(c.id)
    .filter((p) => (!STATE.rep || p.rep_id === STATE.rep) && (!DRILL.localRep || p.rep_id === DRILL.localRep))
    .map((p) => {
      const v26 = MAP_STATE.kind === "week"
        ? widx.reduce((a, i) => a + p.weekly.w26[i], 0)
        : midx.reduce((a, i) => a + p.monthly.m26[i], 0);
      return { id: p.id, name: p.name, rep: p.rep_label, v26 };
    });
  const partnerTable = buildDataTable({
    columns: [
      { key: "name", label: "Partner" },
      { key: "rep", label: "Rep" },
      { key: "v26", label: "2026", numeric: true, format: (r) => fmtMoney(r.v26) },
    ],
    rows: prows, ui: { sortKey: "v26", sortDir: "desc", query: "" },
  });

  wrap.innerHTML = kpi + brandBlock + chipBlock + `<div class="mg-block-title">Partners</div>`;
  wrap.appendChild(partnerTable);
  wrap.querySelector(".mg-drill-close").addEventListener("click", () => { DRILL.countyId = null; DRILL.localRep = null; renderActiveTab(); });
  wrap.querySelectorAll(".rep-chip").forEach((ch) => ch.addEventListener("click", () => {
    DRILL.localRep = DRILL.localRep === ch.dataset.rep ? null : ch.dataset.rep;
    renderActiveTab();
  }));
  return wrap;
}

function openDrill(id) { DRILL.countyId = id; DRILL.localRep = null; renderActiveTab(); }

function renderCounties(state, panel) {
  const model = paintModel();
  const ext = extentOf(model.vals);

  const toggle = `<div class="mg-mapfilter">
      <span class="mg-mapfilter-lbl">Map period:</span>
      <div class="mg-mp-toggle" role="group" aria-label="Map period (month or week)">
        <button class="mg-mp-btn${MAP_STATE.kind === "month" ? " on" : ""}" data-mp="month">🗓️ Month</button>
        <button class="mg-mp-btn${MAP_STATE.kind === "week" ? " on" : ""}" data-mp="week">📅 Week</button>
      </div>
      <span class="mg-mapfilter-note">${mapModeLabel(model.mode)}</span>
    </div>`;

  let notes = "";
  if (state.brand) {
    notes = `<div class="note"><strong>Brand filter not applied to map paint.</strong> Brand choropleth lives in the <strong>Brand heatmap</strong> tab (P4); county brand mix (period-aware) is in the drill below (D-03).</div>`;
  }

  panel.innerHTML = notes + toggle;
  const layout = el('<div class="mg-layout"></div>');
  const mapWrap = el('<div class="mg-map-wrap"></div>');
  mapWrap.innerHTML = renderMapSVG(model, ext) + renderLegend(model, ext);
  const tableWrap = el('<div class="mg-table-side"></div>');
  tableWrap.appendChild(countyTable());
  layout.append(mapWrap, tableWrap);
  panel.appendChild(layout);
  panel.appendChild(renderDrill());

  panel.querySelectorAll(".mg-mp-btn").forEach((b) => b.addEventListener("click", () => { MAP_STATE.kind = b.dataset.mp; renderActiveTab(); }));
  panel.querySelectorAll(".mg-map .mg-county").forEach((p) => p.addEventListener("click", () => openDrill(p.dataset.id)));
}

registerTab({ id: "counties", label: "Counties" }, renderCounties);
