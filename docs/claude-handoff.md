# Claude / implementer handoff

You implement the **coding** half of this portfolio product.
Docs, schema, and product rules are owned by the portfolio architect (Grok) / human owner.

## Repo

`county-sales-dashboard` — **public portfolio**, synthetic data only.
English UI + README. MIT license.

## Already done — do not redo

| Item | Path |
|------|------|
| Product pitch + quick start | `README.md` |
| Architecture | `docs/architecture.md` |
| Decisions D-01…D-07 | `docs/decisions.md` |
| Acceptance checklist | `docs/product-spec.md` |
| **DATA contract** | `docs/data-contract.md` |
| Generator (deterministic) | `scripts/generate_synthetic_data.py` |
| Generated world | `data/synthetic/world.json` (run generator) |
| Scaffold build (KPI stub) | `scripts/build.py` → `output/index.html` |
| Invariant tests | `tests/test_synthetic_world.py` |
| Publish notes | `docs/PUBLISH.md` |

```bash
python scripts/generate_synthetic_data.py
python scripts/build.py
python -m pytest tests/ -q
python -m http.server 8765 --directory output
```

## Your job (ordered phases)

### Phase 1 — Shell + Overview
1. Modular sources under `src/dashboard/` (shell + tabs); `build.py` bundles into **one** `output/index.html` with `window.DATA`.
2. Global bar: months (1–12), weeks (from `DATA.meta.weeks`), brand select, rep select, Clear.
3. State: `{ months: Set, weeks: Set, brand: string|null, rep: string|null }` + `TAB_FILTER_RENDER_FNS` pub/sub.
4. Overview: KPI strip (26 / 25 / plan / YoY) + simple monthly chart from partners or meta + monthly sums.
5. **Default = baseline** (`meta.company_ytd_26`).

### Phase 2 — Tables
- **Reps / Brands / Partners** tables: sort, respect global filters where grain exists.
- Partners: search by name/id.
- Document skips (e.g. brand filter on rep table if no rep×brand series).

### Phase 3 — Counties map + drill
- Map: simplified HU counties (SVG paths OK; cite source in comment if copied).
- **Map-local** month | week XOR (does not clear global Sets).
- Unfiltered: YTD or simple performance coloring.
- Period subset, no rep → YoY from `counties[].monthly` or weekly partner rollup.
- Rep active → annual `by_rep` magnitude (period soft-ignore — D-04).
- **Drill on county click:** KPI + **Alpha/Beta/Gamma brand cards** from `by_brand` + partner list + rep chips with **county-local share %**.

### Phase 4 — Brand heatmap tab
- Chips Alpha/Beta/Gamma/Other → choropleth from `counties[].monthly_by_brand[id]`, period-aware over selected months (annual when all selected). `by_brand` remains the annual convenience total.

### Phase 5 — Hardening
- Extend pytest (filter helpers if pure Python; keep generator invariants).
- Screenshots in `screenshots/` + README links.
- Product-spec checklist all green → suggest tag `v1.0.0`.

## Target layout (create as needed)

```text
src/dashboard/
  shell.html          (or shell.js + css)
  tabs/
    overview/
    reps/
    brands/
    partners/
    counties/
    brand_heatmap/
scripts/build.py      (assemble → output/index.html)
```

## Rules

| Do | Don't |
|----|--------|
| Follow `docs/decisions.md` + `data-contract.md` | Copy employer/real CRM data |
| D-07 visible notes when grain missing | Silent zero maps |
| Keep `meta.synthetic === true` | Invent county×brand×month |
| Small commits | Rewrite generator schema without updating contract + tests |

## Definition of done

- [ ] `docs/product-spec.md` acceptance checklist
- [ ] `pytest -q` green
- [ ] Offline `output/index.html` after build
- [ ] `git grep`-safe: no real company/customer names

## Out of scope unless asked

GitHub Actions, Playwright, heavy i18n, auth, editable plans.
