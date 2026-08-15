# County Sales Dashboard

**Product-ready demo** of a multi-tab Hungarian wholesale-style sales analytics UI: global filters, reactive county map, partner/rep/brand views, and synthetic data only.

> No real company, customers, or revenue. All figures are generated.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Why this exists

Hiring managers rarely see full production analytics systems. This repo is a **self-contained, interview-safe** slice of that class of product:

| Capability | What you can click through |
|------------|----------------------------|
| Global filters | Brand · Rep · Month **and** Week (independent) |
| County map | Choropleth reacts to filters; map-local month/week mode |
| Drill-downs | County → KPIs, brand cards, partner list |
| Multi-tab shell | Overview · Reps · Brands · Partners · Counties · Brand heatmap |
| Engineering | Synthetic data pipeline, tests, written design decisions |

Built as a **portfolio product**, not a toy chart dump.

---

## Quick start

```bash
# 1. Generate synthetic data (reproducible seed)
python scripts/generate_synthetic_data.py

# 2. Build static dashboard bundle
python scripts/build.py

# 3. Serve
python -m http.server 8765 --directory output
# → http://localhost:8765/
```

**Requirements:** Python 3.11+, no external cloud services.

---

## Product surface (target)

```text
┌─────────────────────────────────────────────────────────┐
│  Global bar:  [Months…] [Weeks…]  Brand ▾  Rep ▾  Clear │
├─────────────────────────────────────────────────────────┤
│  Tabs: Overview | Reps | Brands | Partners | Counties   │
│        | Brand heatmap                                    │
├─────────────────────────────────────────────────────────┤
│  Active tab body (tables + optional map / drill overlay)│
└─────────────────────────────────────────────────────────┘
```

**Default (no filters)** = full-year baseline totals (regression gate).
**Filtered** = client-side re-aggregation from the DATA blob — no server.

---

## Architecture (one screen)

```text
scripts/generate_synthetic_data.py
        ↓
data/synthetic/*.json
        ↓
scripts/build.py          → output/index.html
        ↓
Browser: shell filter state → tab renderers (pub/sub)
```

Design rules (see `docs/decisions.md`):

1. **Global period is dual** (month and week independent).
2. **Map period is XOR** (month *or* week drives the choropleth).
3. **No invented cubes** — if a grain does not exist, soft-ignore and label it.
4. **Synthetic only** — never import real CRM/ERP exports into this repo.

---

## Repo layout

```text
docs/           architecture, decisions, product-spec, data-contract, claude-handoff, ISSUES
data/synthetic/ Generated JSON (run generator)
scripts/        generate_synthetic_data.py, build.py
src/dashboard/  Shell + tab modules (implementer)
tests/          Aggregation + invariant tests
```

---

## Status

| Phase | State |
|-------|--------|
| Scaffold + schema + docs + DATA contract | **Done** |
| Deterministic generator + invariant tests | **Done** |
| Scaffold `build.py` → KPI stub page | **Done** |
| Full multi-tab UI | **Next — #3 P1** |
| Screenshots + GitHub Pages | After UI |
| v1.0.0 portfolio tag | Product-spec checklist green |

**VERSION:** `0.1.0-scaffold`  
**Issues:** [#1 epic](https://github.com/TakeMyCodem/county-sales-dashboard/issues/1)

---

## Author

Portfolio project — synthetic wholesale analytics demo.
Not affiliated with any employer or live sales system.

## License

MIT — see [LICENSE](LICENSE).
