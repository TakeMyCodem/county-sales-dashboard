# Architecture

## Goals

- **Interview-readable:** one HTML entry, clear filter → render path.
- **Honest aggregates:** only combine grains that exist in synthetic data.
- **Fast local loop:** generate → build → static serve.

## Runtime

| Layer | Responsibility |
|-------|----------------|
| **Synthetic generator** | Fixed seed → partners, counties, brand×partner monthly/weekly series, plans |
| **Build** | Embed JSON into a single `output/index.html` (or `index.html` + `data.js`) |
| **Shell** | Global filter state `{ months: Set, weeks: Set, brand, rep }` + tab registry |
| **Tabs** | Subscribe to filter changes; re-sum from in-memory DATA |

No backend, no auth, no live DB.

## Data model (logical)

```text
County (id, name)
  └── Partner (id, name, county_id, rep_id)
        └── facts: monthly[12] × {y2025, y2026}, weekly[W] × {y2025, y2026}
        └── plan: annual target (optional)

Brand (id, name)
  └── partner×brand monthly contribution (shares of partner revenue)

Rep (id, label)
```

**Company total** = sum of partner 2026 YTD (or selected period).
**County total** = sum of partners in county (single-county partners only in v1 for simplicity).

## Filter composition

| Control | Scope |
|---------|--------|
| Months / Weeks (global) | Independent Sets; tables/panes that have period series slice |
| Brand / Rep (global) | Filter partner sets / brand tables |
| Map period toggle | Local `month | week` — only affects choropleth paint |
| Status (optional later) | Orthogonal chips — not in v1 MVP |

**Default:** all months, all weeks, brand=null, rep=null → baseline.

## Map rules

1. Unfiltered → static performance or YTD view (document metric in UI).
2. Period subset, no rep → YoY by county from monthly or weekly county sums.
3. Rep active → annual county×rep magnitude (period soft-ignored if no county×rep×period grain).
4. Brand on map → v1 **Brand heatmap tab** uses county×brand **annual** only.

## Security / privacy

This repo is public-safe by construction: generator creates all entities.
Do not commit real exports. CI should fail if forbidden tokens appear (optional hook).

## Extension points

- Multi-shop partners (one partner → N counties) — v1.1
- Status taxonomy chips — v1.1
- CSV export on every table — easy win
- CI: pytest + playwright smoke — v1.0 hardening
