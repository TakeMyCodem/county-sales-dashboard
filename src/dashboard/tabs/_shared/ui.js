/* Shared UI helpers for table tabs (P2).
 *
 * buildDataTable: a sortable (and optionally searchable) table whose sort/search
 * state persists across global-filter re-renders via a caller-owned `ui` object.
 * The search input element is kept alive between redraws so focus/caret survive.
 *
 * Also: honest period aggregation helper (partnerMonthsSum) and filter notes.
 */

// config: { columns, rows, ui, search? }
//   columns: [{ key, label, numeric?, align?, format?(row)->html }]
//   rows:    [{ [key]: rawSortableValue, ... }]
//   ui:      { sortKey, sortDir, query }  (persistent; mutated in place)
//   search:  { placeholder, fields: string[] }  (optional)
function buildDataTable(config) {
  const { columns, rows, ui } = config;
  const wrap = el('<div class="table-wrap"></div>');

  const tools = el('<div class="table-tools"></div>');
  const count = el('<span class="table-count"></span>');
  let searchBox = null;
  if (config.search) {
    searchBox = el(`<input class="table-search" type="search" placeholder="${config.search.placeholder}" />`);
    searchBox.value = ui.query || "";
    searchBox.addEventListener("input", () => { ui.query = searchBox.value; draw(); });
    tools.appendChild(searchBox);
  }
  tools.appendChild(count);
  wrap.appendChild(tools);

  const scroll = el('<div class="table-scroll"></div>');
  const table = el('<table class="data-table"></table>');
  const thead = el("<thead></thead>");
  const headRow = el("<tr></tr>");
  columns.forEach((c) => {
    const th = el(`<th class="${c.numeric || c.align === "right" ? "num" : ""}" data-key="${c.key}" role="button" tabindex="0">${c.label}<span class="sort-ind"></span></th>`);
    const activate = () => setSort(c);
    th.addEventListener("click", activate);
    th.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(); } });
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  const tbody = el("<tbody></tbody>");
  table.append(thead, tbody);
  scroll.appendChild(table);
  wrap.appendChild(scroll);

  function setSort(col) {
    if (ui.sortKey === col.key) {
      ui.sortDir = ui.sortDir === "asc" ? "desc" : "asc";
    } else {
      ui.sortKey = col.key;
      ui.sortDir = col.numeric ? "desc" : "asc";
    }
    draw();
  }

  function currentRows() {
    let out = rows;
    if (config.search && ui.query) {
      const q = ui.query.trim().toLowerCase();
      out = out.filter((r) => config.search.fields.some((f) => String(r[f]).toLowerCase().includes(q)));
    }
    if (ui.sortKey) {
      const col = columns.find((c) => c.key === ui.sortKey);
      out = out.slice().sort((a, b) => {
        const av = a[ui.sortKey], bv = b[ui.sortKey];
        let cmp;
        if (col && col.numeric) cmp = (av === null ? -Infinity : av) - (bv === null ? -Infinity : bv);
        else cmp = String(av).localeCompare(String(bv));
        return ui.sortDir === "desc" ? -cmp : cmp;
      });
    }
    return out;
  }

  function draw() {
    const disp = currentRows();
    tbody.innerHTML = disp
      .map((r) => {
        const rc = config.rowClass ? config.rowClass(r) : "";
        return `<tr${rc ? ` class="${rc}"` : ""}>` + columns.map((c) => {
          const cls = c.numeric || c.align === "right" ? ' class="num"' : "";
          return `<td${cls}>${c.format ? c.format(r) : r[c.key]}</td>`;
        }).join("") + "</tr>";
      })
      .join("");
    count.textContent = `${disp.length} row${disp.length === 1 ? "" : "s"}`;
    headRow.querySelectorAll("th").forEach((th) => {
      const ind = th.querySelector(".sort-ind");
      ind.textContent = th.dataset.key === ui.sortKey ? (ui.sortDir === "desc" ? " ▼" : " ▲") : "";
    });
  }

  draw();
  return wrap;
}

// Honest partner period aggregation over selected months.
// With a brand: partner × brand × month (monthly_brand); else the monthly total.
// No proportional heuristic — the grain exists (data-contract v0.3.2+, D-04).
function partnerMonthsSum(p, brand, idxs) {
  const src = brand ? p.monthly_brand[brand] : p.monthly;
  let v26 = 0, v25 = 0;
  for (const i of idxs) { v26 += src.m26[i]; v25 += src.m25[i]; }
  return { v26, v25 };
}

// D-03: months and weeks are independent global Sets; monthly-grain views slice by
// months, and the week set drives the Counties map (month|week XOR). Note shown when
// the week selection is non-default so it's clear weeks don't change this view.
function weekNote(state) {
  if (weeksAreDefault()) return "";
  return `<div class="note"><strong>Week selection not applied here.</strong> This view slices by month; the week set drives the Counties map's week mode (D-03).</div>`;
}

// Brand filter is honest at the month grain now; the only caveat is that plan
// has no brand split, so plan attainment is hidden while a brand is selected.
function brandFilterNote(state) {
  if (!state.brand) return "";
  const bname = (DATA.brands.find((b) => b.id === state.brand) || {}).name || state.brand;
  return `<div class="note"><strong>Brand filter (${bname}):</strong> figures use the brand×month grain; plan attainment is hidden (plan is not split by brand).</div>`;
}
