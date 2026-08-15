#!/usr/bin/env python3
"""Build stub — embed synthetic world into a minimal shell HTML.

Full tab UI is implementer work (see docs/claude-handoff.md).
This script proves the data → output path works today.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORLD = ROOT / "data" / "synthetic" / "world.json"
OUT_DIR = ROOT / "output"
OUT_HTML = OUT_DIR / "index.html"


def main() -> None:
    if not WORLD.exists():
        raise SystemExit("Missing data/synthetic/world.json — run generate_synthetic_data.py first")

    world = json.loads(WORLD.read_text(encoding="utf-8"))
    meta = world["meta"]
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>County Sales Dashboard (synthetic)</title>
  <style>
    body {{ font-family: system-ui, sans-serif; margin: 2rem; max-width: 52rem; color: #0f172a; }}
    code {{ background: #f1f5f9; padding: 0.1rem 0.35rem; border-radius: 4px; }}
    .kpi {{ display: flex; gap: 1rem; flex-wrap: wrap; margin: 1.5rem 0; }}
    .card {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem 1.25rem; min-width: 9rem; }}
    .label {{ font-size: 0.75rem; color: #64748b; text-transform: uppercase; letter-spacing: .04em; }}
    .val {{ font-size: 1.35rem; font-weight: 700; margin-top: .25rem; }}
    .warn {{ background: #fffbeb; border: 1px solid #fbbf24; padding: 0.75rem 1rem; border-radius: 8px; }}
  </style>
</head>
<body>
  <h1>County Sales Dashboard</h1>
  <p>Synthetic portfolio demo — <strong>not</strong> live company data.</p>
  <div class="warn">
    <strong>Scaffold build.</strong> Full multi-tab UI is implemented next
    (<code>docs/claude-handoff.md</code>). Data pipeline is live.
  </div>
  <div class="kpi">
    <div class="card"><div class="label">2026 YTD</div><div class="val" id="k26">—</div></div>
    <div class="card"><div class="label">2025 YTD</div><div class="val" id="k25">—</div></div>
    <div class="card"><div class="label">Partners</div><div class="val">{meta["n_partners"]}</div></div>
    <div class="card"><div class="label">Counties</div><div class="val">{meta["n_counties"]}</div></div>
  </div>
  <p>Seed <code>{meta["seed"]}</code> · Generator totals match embedded DATA.</p>
  <script>
    window.DATA = {json.dumps(world, ensure_ascii=False)};
    const m = window.DATA.meta;
    const fmt = n => (n / 1e6).toLocaleString('en-US', {{ maximumFractionDigits: 1 }}) + ' M';
    document.getElementById('k26').textContent = fmt(m.company_ytd_26);
    document.getElementById('k25').textContent = fmt(m.company_ytd_25);
  </script>
</body>
</html>
"""
    OUT_HTML.write_text(html, encoding="utf-8")
    print(f"Wrote {OUT_HTML}")


if __name__ == "__main__":
    main()
