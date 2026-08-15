# County Sales Dashboard

**Portfolio demo — a multi-tab synthetic sales analytics UI.** Global filters, a reactive Hungary county map with four paint views, per-county drill-downs, and a brand heatmap — all client-side over a single embedded dataset.

> **Synthetic data only.** Every figure is generated from a fixed seed (`20260815`). No real CRM/ERP, customer, partner, or employer data is present anywhere in this repository. Numbers are plausible but fictional.

**▶ Live demo:** https://claude.ai/code/artifact/59091976-b958-4f8f-a4c3-c60da9e88d13

---

## What it shows

Six tabs, one shared filter bar, one in-memory dataset re-aggregated in the browser:

| Tab | What it does |
|-----|--------------|
| **Overview** | Company KPI strip (2026 / 2025 / YoY / plan attainment) + a monthly 2026-vs-2025 bar chart. |
| **Reps** | Sortable rep table — 2026 / 2025 / YoY / plan, partner counts. |
| **Brands** | Brand breakdown — revenue, share %, YoY; period-aware; the selected brand row is highlighted. |
| **Partners** | Searchable (name / ID) partner table with county, rep, and plan attainment. |
| **Counties** | Reactive county **map + table + drill**. Four map views — **Revenue · YoY · Plan · Dominant rep** — a local **Month \| Week** toggle, and a per-county drill (KPI, brand cards, rep chips with county-local share %, partner list). |
| **Brand heatmap** | Brand chips recolor the county choropleth by that brand's revenue (period-aware), with a ranked county list. |

### Global filter bar
Month pills (1–12), week pills, brand dropdown, rep dropdown, and **Clear** (restores the exact first-load baseline). Months and weeks are **independent** sets; the county map decides which one paints it via a local Month\|Week toggle.

---

## Quick start

```bash
python scripts/generate_synthetic_data.py   # deterministic world.json (seed 20260815)
python scripts/build.py                      # bundle -> output/index.html (+ artifact.html)
python -m pytest tests/ -q                   # 12 invariant + hygiene tests
python -m http.server 8765 --directory output
# open http://localhost:8765/  (or open output/index.html directly)
```

> **Heads-up:** `output/` and `data/synthetic/world.json` are git-ignored (keeps the repo small). After pulling changes, **re-run the generator + build**, and hard-reload the page (`Ctrl+Shift+R`) — browsers cache `file://` pages aggressively.

**Hosting:** `output/index.html` is a single self-contained file — drop the `output/` folder on any static host (e.g. GitHub Pages) and it runs with no backend.

---

## How it's built

- **Generator** (`scripts/generate_synthetic_data.py`) — fixed-seed synthetic world modeled on line-level ERP shape (partner × brand × period × net), rolled up to the grains the UI needs.
- **Build** (`scripts/build.py`) — concatenates the modular `src/dashboard/` sources + embeds the world as `window.DATA` into one offline `output/index.html`. Also emits `output/artifact.html` (a body-only variant for the live demo).
- **Shell** (`src/dashboard/shell.js`) — global filter state `{ months, weeks, brand, rep }`, a tab registry, and a pub/sub that re-renders the active tab on any filter change.
- **Tabs** (`src/dashboard/tabs/*`) — each subscribes and re-aggregates from `DATA` in memory. No backend, no build framework, no external assets.

See [`docs/architecture.md`](docs/architecture.md) and the [`window.DATA` contract](docs/data-contract.md).

---

## Design decisions (why it looks honest)

Full log in [`docs/decisions.md`](docs/decisions.md). The ones a reviewer will notice:

- **D-01 Synthetic only** — generated data; an automated test fails the build if forbidden real-company strings appear.
- **D-03 Dual period, XOR on the map** — tables slice by month; a single choropleth can't honestly show week ∩ month, so the map picks one via a local toggle.
- **D-04 No fabricated cubes** — brand and rep filters aggregate from **real** grains (`partner × brand × month`, `county × rep × month`, …), never an annual figure smeared proportionally across months.
- **D-05 Default = baseline** — clearing filters restores first-load totals; asserted by tests.
- **D-07 Visible limits** — where a view can't honor a filter (e.g. the annual Plan map view, or a brand on the county map), the UI says so instead of showing silent zeros.

---

## Tests

`python -m pytest tests/ -q` → **12 passed**. Generator invariants (brand/rep sub-totals reconcile to totals; deterministic seed; `brand_share` derived from the monthly series) plus hardening gates (no real-company tokens; map geometry ids match the data; the build embeds `window.DATA` and all six tabs).

---

## License

[MIT](LICENSE). Synthetic data; safe to fork and demo.
