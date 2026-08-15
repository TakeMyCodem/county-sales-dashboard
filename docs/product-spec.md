# Product specification (v1)

## Personas

- **Hiring reviewer** — 5-minute click-through.
- **You in interview** — explain filters, map rules, and why totals match.

## Tabs (v1)

| Tab | Must show |
|-----|-----------|
| **Overview** | Company KPI strip (2026 YTD, vs 2025, plan attainment if plan exists) + simple monthly chart |
| **Reps** | Table of reps with 2026/2025/YoY; respects global brand/period where grain allows |
| **Brands** | Brand table; respects global rep/period where grain allows |
| **Partners** | Searchable partner table; global rep/brand filters |
| **Counties** | Map + county table + drill overlay (KPI, synthetic brand cards Alpha/Beta/Gamma, partners) |
| **Brand heatmap** | Brand chips → county choropleth by annual brand revenue |

## Global filter bar

- Month pills (1–12) multi-select
- Week pills (subset of ISO weeks present in data) multi-select
- Brand dropdown (null = all)
- Rep dropdown (null = all)
- Clear

## County drill

On county click:

1. KPI strip for that county (period-aware if monthly series exists).
2. **Top-3 brand cards** for that county (annual brand split — synthetic Alpha/Beta/Gamma).
3. Partner list for that county (filterable by rep chips with **county-local share** %).

## Acceptance checklist

- [x] `python scripts/generate_synthetic_data.py` is deterministic (same seed → same totals) — `test_seed_stable`
- [x] `python scripts/build.py` writes `output/index.html` — `test_build_embeds_data_and_all_tabs`
- [x] Default company 2026 total matches sum of partners — `test_company_ytd_matches_partners_and_counties`
- [x] Selecting one month changes Overview/Partners period panes and county map (month mode) — verified in browser (P1) + aggregation checks (P3)
- [x] Clear restores default totals — verified in browser (P1)
- [x] County drill opens; brand cards non-zero for a high-revenue county — verified in browser (P3) + `monthly_by_brand` checks
- [x] Brand heatmap tab recolors map by selected brand — verified via chip→repaint logic + `monthly_by_brand` checks (P4)
- [x] `pytest -q` green — 12 passed
- [x] Product walkthrough — **live demo Artifact** linked from README (P6); static PNGs optional (`screenshots/`)

## Non-goals (v1)

- Auth, multi-tenant, real maps tiles server
- Editable plans
- Mobile-first polish (desktop demo OK)
- i18n beyond Hungarian labels if desired (English UI is fine for jobs)
