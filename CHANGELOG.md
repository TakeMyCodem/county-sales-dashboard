# Changelog

## [1.0.0] — 2026-08-16

First public portfolio release.

### Product
- Six tabs: Overview, Reps, Brands, Partners, Counties, Brand heatmap
- Global filters: dual month + week sets, brand, rep (client-side)
- Counties map: Month|Week XOR; views **Revenue / YoY / Plan (5-level RAG) / Dominant rep**; period-aware drill
- Brand heatmap: period-aware county×brand choropleth

### Data (synthetic only)
- Seed `20260815`; 180 partners; 20 HU regions (Budapest + 19 counties)
- Grains: partner×brand×month/week, county×brand×month, county×rep×month
- D-01 public hygiene tests; 12 pytest checks

### Build
```bash
python scripts/generate_synthetic_data.py
python scripts/build.py   # → output/index.html (+ artifact.html)
python -m pytest tests/ -q
```

Tag: `v1.0.0` on `main`.
