#!/usr/bin/env python3
"""Build — bundle the modular dashboard sources into one offline HTML.

Assembles src/dashboard/{shell.html, styles.css, shell.js, tab modules} plus the
generated world into a single output/index.html with `window.DATA` (D-06).

Modules are concatenated in a fixed order: shell.js MUST come first (it defines
STATE, registerTab, formatters); tab modules register themselves afterwards.

Run `scripts/generate_synthetic_data.py` first to produce data/synthetic/world.json.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src" / "dashboard"
WORLD = ROOT / "data" / "synthetic" / "world.json"
OUT_DIR = ROOT / "output"
OUT_HTML = OUT_DIR / "index.html"

# Order matters: shell first, shared helpers next, then tab modules, stubs last.
JS_MODULES = [
    SRC / "shell.js",
    SRC / "tabs" / "_shared" / "ui.js",
    SRC / "tabs" / "overview" / "overview.js",
    SRC / "tabs" / "reps" / "reps.js",
    SRC / "tabs" / "brands" / "brands.js",
    SRC / "tabs" / "partners" / "partners.js",
    SRC / "tabs" / "counties" / "hu-counties-geo.js",
    SRC / "tabs" / "counties" / "counties.js",
    SRC / "tabs" / "stubs.js",
]


def _read(p: Path) -> str:
    if not p.exists():
        raise SystemExit(f"Missing source file: {p.relative_to(ROOT)}")
    return p.read_text(encoding="utf-8")


def main() -> None:
    if not WORLD.exists():
        raise SystemExit(
            "Missing data/synthetic/world.json — run scripts/generate_synthetic_data.py first"
        )

    world = json.loads(WORLD.read_text(encoding="utf-8"))
    shell = _read(SRC / "shell.html")
    styles = _read(SRC / "styles.css")

    modules = "\n\n".join(
        f"/* ===== {p.relative_to(SRC).as_posix()} ===== */\n{_read(p)}" for p in JS_MODULES
    )

    # `</script>` inside embedded JSON would close the tag early — escape defensively.
    data_json = json.dumps(world, ensure_ascii=False).replace("</", "<\\/")
    data_block = f"window.DATA = {data_json};"

    html = shell
    html = html.replace("/* __STYLES__ */", styles)
    html = html.replace("/* __DATA__ */", data_block)
    html = html.replace("/* __MODULES__ */", modules)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    OUT_HTML.write_text(html, encoding="utf-8")

    size_kb = OUT_HTML.stat().st_size / 1024
    m = world["meta"]
    print(f"Wrote {OUT_HTML.relative_to(ROOT)} ({size_kb:,.0f} KB)")
    print(
        f"Baseline company 2026 YTD: {m['company_ytd_26']:,.0f}  |  "
        f"2025: {m['company_ytd_25']:,.0f}  |  plan: {m['company_plan']:,.0f}"
    )


if __name__ == "__main__":
    main()
