/* Overview tab — company KPI strip + monthly chart.
 *
 * Grain used: partner x month (monthly.m26 / m25) and partner.plan_annual.
 *  - Months filter: sums the selected month indexes (canonical annual series;
 *    all 12 selected -> equals meta.company_ytd_26, the baseline — D-05).
 *  - Rep filter: partner attribute -> subsets partners honestly.
 *  - Brand filter: brand_share is ANNUAL only. Applying it to monthly values is a
 *    documented demo heuristic (D-04); a visible note is shown when brand is active.
 *  - Weeks: independent grain (partner x week). Overview is month-based, so weeks do
 *    not change these KPIs. A note is shown when the week selection is non-default (D-07).
 */

// Reduce filtered partners over selected months -> { s26, s25, plan, partnerCount, yoy, attain }.
function overviewAggregate(state) {
  const monthsIdx = selectedMonthIndexes();
  const brand = state.brand;
  let s26 = 0, s25 = 0, plan = 0, partnerCount = 0;

  for (const p of DATA.partners) {
    if (state.rep && p.rep_id !== state.rep) continue;
    partnerCount++;
    let p26 = 0, p25 = 0;
    for (const i of monthsIdx) { p26 += p.monthly.m26[i]; p25 += p.monthly.m25[i]; }
    let pplan = p.plan_annual;
    if (brand) {
      const sh = p.brand_share[brand] || 0; // annual share applied proportionally (D-04 heuristic)
      p26 *= sh; p25 *= sh; pplan *= sh;
    }
    s26 += p26; s25 += p25; plan += pplan;
  }
  return {
    s26, s25, plan, partnerCount,
    yoy: s25 ? s26 / s25 - 1 : null,
    attain: plan ? s26 / plan : null,
  };
}

// Per-month sums across filtered partners (brand-applied), for the chart.
function overviewMonthlySeries(state) {
  const brand = state.brand;
  const m26 = new Array(12).fill(0);
  const m25 = new Array(12).fill(0);
  for (const p of DATA.partners) {
    if (state.rep && p.rep_id !== state.rep) continue;
    const sh = brand ? (p.brand_share[brand] || 0) : 1;
    for (let i = 0; i < 12; i++) { m26[i] += p.monthly.m26[i] * sh; m25[i] += p.monthly.m25[i] * sh; }
  }
  return { m26, m25 };
}

function kpiCard(label, value, foot) {
  return `<div class="kpi-card">
    <div class="kpi-label">${label}</div>
    <div class="kpi-value">${value}</div>
    <div class="kpi-foot">${foot || "&nbsp;"}</div>
  </div>`;
}

function overviewChartSVG(state) {
  const { m26, m25 } = overviewMonthlySeries(state);
  const W = 720, H = 240, padL = 8, padR = 8, padT = 12, padB = 22;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const max = Math.max(1, ...m26, ...m25);
  const groupW = plotW / 12;
  const barW = groupW * 0.32;
  const gap = groupW * 0.06;

  let bars = "";
  for (let i = 0; i < 12; i++) {
    const gx = padL + i * groupW + groupW / 2;
    const h26 = (m26[i] / max) * plotH;
    const h25 = (m25[i] / max) * plotH;
    const selected = state.months.has(i + 1);
    const dim = selected ? "" : " bar-dim";
    // 2025 (left, light), 2026 (right, accent)
    const x25 = gx - barW - gap / 2;
    const x26 = gx + gap / 2;
    bars += `<rect class="b25${dim}" x="${x25.toFixed(1)}" y="${(padT + plotH - h25).toFixed(1)}" width="${barW.toFixed(1)}" height="${h25.toFixed(1)}" fill="var(--bar25)" rx="2"><title>${MONTH_NAMES[i]} 2025: ${fmtMoney(m25[i])}</title></rect>`;
    bars += `<rect class="b26${dim}" x="${x26.toFixed(1)}" y="${(padT + plotH - h26).toFixed(1)}" width="${barW.toFixed(1)}" height="${h26.toFixed(1)}" fill="var(--bar26)" rx="2"><title>${MONTH_NAMES[i]} 2026: ${fmtMoney(m26[i])}</title></rect>`;
    bars += `<text x="${gx.toFixed(1)}" y="${H - 6}" text-anchor="middle">${MONTH_NAMES[i]}</text>`;
  }
  const baseY = padT + plotH;
  return `<svg class="chart-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Monthly revenue 2026 vs 2025">
    <line x1="${padL}" y1="${baseY}" x2="${W - padR}" y2="${baseY}" stroke="var(--line)" />
    ${bars}
  </svg>`;
}

function renderOverview(state, panel) {
  const a = overviewAggregate(state);
  const monthsLabel = monthsAreDefault() ? "full year" : `${state.months.size} month${state.months.size > 1 ? "s" : ""}`;
  const deltaCls = a.yoy === null ? "" : a.yoy >= 0 ? "pos" : "neg";

  const notes = [];
  if (state.brand) {
    const bname = (DATA.brands.find((b) => b.id === state.brand) || {}).name || state.brand;
    notes.push(`<div class="note"><strong>Brand filter (${bname}):</strong> brand share is an annual figure — it is applied proportionally to monthly revenue and plan as a demo heuristic (no brand&times;month grain exists, D-04).</div>`);
  }
  if (!weeksAreDefault()) {
    notes.push(weekNote(state));
  }

  panel.innerHTML = `
    ${notes.join("")}
    <div class="kpi-strip">
      ${kpiCard("2026 revenue", fmtMoney(a.s26), `${monthsLabel} &middot; ${a.partnerCount} partners`)}
      ${kpiCard("2025 revenue", fmtMoney(a.s25), "same period")}
      ${kpiCard("YoY", `<span class="delta ${deltaCls}">${fmtPct(a.yoy)}</span>`, "2026 vs 2025")}
      ${kpiCard("Plan attainment", a.attain === null ? "—" : (a.attain * 100).toFixed(0) + "%", `plan ${fmtMoney(a.plan)}`)}
    </div>
    <div class="chart-card">
      <div class="chart-head">
        <h2>Monthly revenue &mdash; 2026 vs 2025</h2>
        <div class="chart-legend">
          <span><span class="swatch" style="background:var(--bar26)"></span>2026</span>
          <span><span class="swatch" style="background:var(--bar25)"></span>2025</span>
        </div>
      </div>
      ${overviewChartSVG(state)}
    </div>`;
}

registerTab({ id: "overview", label: "Overview" }, renderOverview);
