/* Shell — global filter state, filter bar, tab registry + pub/sub.
 *
 * Loaded first by build.py; tab modules (loaded after) call registerTab().
 * window.DATA is embedded above this script.
 *
 * State shape (docs/claude-handoff.md Phase 1.3):
 *   { months: Set<number 1..12>, weeks: Set<number>, brand: string|null, rep: string|null }
 * Default = baseline: all months, all weeks, no brand, no rep (D-05).
 */

const DATA = window.DATA;
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ALL_MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const ALL_WEEKS = DATA.meta.weeks.slice();

const STATE = {
  months: new Set(ALL_MONTHS),
  weeks: new Set(ALL_WEEKS),
  brand: null,
  rep: null,
};

/* ---- Derived-state helpers (shared by tabs) ---- */

// Selected months as 0-based indexes into monthly.m26/m25 arrays, ascending.
function selectedMonthIndexes() {
  return [...STATE.months].sort((a, b) => a - b).map((m) => m - 1);
}
function monthsAreDefault() { return STATE.months.size === ALL_MONTHS.length; }
function weeksAreDefault() { return STATE.weeks.size === ALL_WEEKS.length; }
function anyFilterActive() {
  return !monthsAreDefault() || !weeksAreDefault() || STATE.brand !== null || STATE.rep !== null;
}

/* ---- Formatters ---- */

// HUF-like magnitude formatter: 2_247_142_596 -> "2.25 Bn"
function fmtMoney(n) {
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n / 1e9).toLocaleString("en-US", { maximumFractionDigits: 2 }) + " Bn";
  if (abs >= 1e6) return (n / 1e6).toLocaleString("en-US", { maximumFractionDigits: 1 }) + " M";
  if (abs >= 1e3) return (n / 1e3).toLocaleString("en-US", { maximumFractionDigits: 0 }) + " k";
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}
function fmtPct(x, digits = 1) {
  if (x === null || x === undefined || !isFinite(x)) return "—";
  const v = x * 100;
  return (v >= 0 ? "+" : "") + v.toFixed(digits) + "%";
}
function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

/* ---- Tab registry + pub/sub ---- */

const TAB_FILTER_RENDER_FNS = {}; // id -> (state) => void, called on filter change & activation
const TAB_META = [];              // ordered [{ id, label, soon }]
let ACTIVE_TAB = null;

// tab: { id, label, soon?: string }.  renderFn receives (STATE, panelEl).
function registerTab(tab, renderFn) {
  TAB_META.push(tab);
  TAB_FILTER_RENDER_FNS[tab.id] = (state) => renderFn(state, document.getElementById("panel-" + tab.id));
}

function setActiveTab(id) {
  ACTIVE_TAB = id;
  document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === id));
  document.querySelectorAll(".tab-panel").forEach((p) => p.classList.toggle("active", p.id === "panel-" + id));
  renderActiveTab();
}

function renderActiveTab() {
  const fn = TAB_FILTER_RENDER_FNS[ACTIVE_TAB];
  if (fn) fn(STATE);
}

// Called by every filter mutation: re-render the visible tab (others re-render lazily on activation).
function notifyFilterChange() {
  renderActiveTab();
}

/* ---- Filter bar construction ---- */

function buildFilterBar() {
  const bar = document.getElementById("filterbar");

  // Months
  const monthsGroup = el(`<div class="filter-group">
    <div class="filter-label">Months <button class="mini-clear" data-act="months-all">all</button></div>
    <div class="pill-row months"></div>
  </div>`);
  const monthsRow = monthsGroup.querySelector(".pill-row");
  ALL_MONTHS.forEach((m) => {
    const pill = el(`<button class="pill" data-month="${m}">${MONTH_NAMES[m - 1]}</button>`);
    pill.addEventListener("click", () => toggleSetMember(STATE.months, m, pill, ALL_MONTHS));
    monthsRow.appendChild(pill);
  });

  // Weeks
  const weeksGroup = el(`<div class="filter-group">
    <div class="filter-label">Weeks <button class="mini-clear" data-act="weeks-all">all</button></div>
    <div class="pill-row weeks"></div>
  </div>`);
  const weeksRow = weeksGroup.querySelector(".pill-row");
  ALL_WEEKS.forEach((w) => {
    const pill = el(`<button class="pill" data-week="${w}">W${w}</button>`);
    pill.addEventListener("click", () => toggleSetMember(STATE.weeks, w, pill, ALL_WEEKS));
    weeksRow.appendChild(pill);
  });

  // Brand
  const brandGroup = el(`<div class="filter-group">
    <div class="filter-label">Brand</div>
    <select class="filter-select" id="sel-brand"><option value="">All brands</option></select>
  </div>`);
  const brandSel = brandGroup.querySelector("select");
  DATA.brands.forEach((b) => brandSel.appendChild(el(`<option value="${b.id}">${b.name}</option>`)));
  brandSel.addEventListener("change", () => { STATE.brand = brandSel.value || null; notifyFilterChange(); });

  // Rep
  const repGroup = el(`<div class="filter-group">
    <div class="filter-label">Rep</div>
    <select class="filter-select" id="sel-rep"><option value="">All reps</option></select>
  </div>`);
  const repSel = repGroup.querySelector("select");
  DATA.reps.forEach((r) => repSel.appendChild(el(`<option value="${r.id}">${r.label}</option>`)));
  repSel.addEventListener("change", () => { STATE.rep = repSel.value || null; notifyFilterChange(); });

  // Clear (restores baseline — D-05)
  const clearBtn = el(`<button class="clear-all" title="Restore baseline (all months & weeks, no brand/rep)">Clear filters</button>`);
  clearBtn.addEventListener("click", clearFilters);

  bar.append(monthsGroup, weeksGroup, brandGroup, repGroup, clearBtn);

  // mini "all" resets per group
  monthsGroup.querySelector(".mini-clear").addEventListener("click", () => resetGroup("months"));
  weeksGroup.querySelector(".mini-clear").addEventListener("click", () => resetGroup("weeks"));

  syncPillClasses();
}

// Toggle a member; never allow an empty set (empty period = no data). Re-toggle if last one removed.
function toggleSetMember(set, value, pill, all) {
  if (set.has(value)) {
    if (set.size === 1) return; // keep at least one selected
    set.delete(value);
  } else {
    set.add(value);
  }
  pill.classList.toggle("on", set.has(value));
  notifyFilterChange();
}

function resetGroup(which) {
  if (which === "months") STATE.months = new Set(ALL_MONTHS);
  else STATE.weeks = new Set(ALL_WEEKS);
  syncPillClasses();
  notifyFilterChange();
}

function clearFilters() {
  STATE.months = new Set(ALL_MONTHS);
  STATE.weeks = new Set(ALL_WEEKS);
  STATE.brand = null;
  STATE.rep = null;
  const bsel = document.getElementById("sel-brand");
  const rsel = document.getElementById("sel-rep");
  if (bsel) bsel.value = "";
  if (rsel) rsel.value = "";
  syncPillClasses();
  notifyFilterChange();
}

function syncPillClasses() {
  document.querySelectorAll(".pill[data-month]").forEach((p) => p.classList.toggle("on", STATE.months.has(+p.dataset.month)));
  document.querySelectorAll(".pill[data-week]").forEach((p) => p.classList.toggle("on", STATE.weeks.has(+p.dataset.week)));
}

/* ---- Tab bar + panels construction ---- */

function buildTabs() {
  const tabbar = document.getElementById("tabbar");
  const panels = document.getElementById("panels");
  TAB_META.forEach((tab, i) => {
    const btn = el(`<button class="tab-btn" data-tab="${tab.id}">${tab.label}${tab.soon ? `<span class="soon">${tab.soon}</span>` : ""}</button>`);
    btn.addEventListener("click", () => setActiveTab(tab.id));
    tabbar.appendChild(btn);
    panels.appendChild(el(`<section class="tab-panel" id="panel-${tab.id}" role="tabpanel"></section>`));
  });
}

/* ---- Boot ---- */

function boot() {
  document.getElementById("footer-seed").textContent = DATA.meta.seed;
  buildFilterBar();
  buildTabs();
  if (TAB_META.length) setActiveTab(TAB_META[0].id);
}

document.addEventListener("DOMContentLoaded", boot);
