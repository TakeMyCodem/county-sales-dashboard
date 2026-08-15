/* Shared UI helpers for table tabs (P2).
 *
 * buildDataTable: a sortable (and optionally searchable) table whose sort/search
 * state persists across global-filter re-renders via a caller-owned `ui` object.
 * The search input element is kept alive between redraws so focus/caret survive.
 *
 * Also: consistent D-04 (brand annual heuristic) and D-07 (week grain) notes.
 */

// Sum an array (e.g. monthly.m26) over selected month indexes.
function sumMonths(arr, idxs) {
  let s = 0;
  for (const i of idxs) s += arr[i];
  return s;
}

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

// D-04: brand share is annual; note explains how it is applied in this view.
function brandNote(state, mode) {
  if (!state.brand) return "";
  const bname = (DATA.brands.find((b) => b.id === state.brand) || {}).name || state.brand;
  const how = mode === "annual"
    ? "brand figures are annual (brand share &times; annual revenue); month/week filters are not applied here"
    : "the annual brand share is applied proportionally to the selected period (demo heuristic)";
  return `<div class="note"><strong>Brand filter (${bname}):</strong> ${how} — no brand&times;month grain exists (D-04).</div>`;
}

// D-07: week grain not honored by monthly-based views (weeks feed the Counties map, P3).
function weekNote(state) {
  if (weeksAreDefault()) return "";
  return `<div class="note"><strong>Week selection not applied here.</strong> This view aggregates on the monthly grain; the week set feeds the Counties map's week mode (P3) (D-07).</div>`;
}
