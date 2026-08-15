#!/usr/bin/env python3
"""Build — bundle the modular dashboard sources into one offline HTML.

Assembles src/dashboard/{shell.html, styles.css, shell.js, tab modules} plus the
generated world into a single output/index.html with `window.DATA` (D-06).

Also emits output/artifact.html — a body-only, self-contained variant (no outer
<html>/<head>/<body> wrapper) suitable for publishing as a claude.ai Artifact,
which supplies its own document skeleton. Both share one bundle; the shell boots
whether DOMContentLoaded has fired yet or not.

Modules are concatenated in a fixed order: shell.js MUST come first (it defines
STATE, registerTab, formatters); tab modules register themselves afterwards.

Run `scripts/generate_synthetic_data.py` first to produce data/synthetic/world.json.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src" / "dashboard"
WORLD = ROOT / "data" / "synthetic" / "world.json"
OUT_DIR = ROOT / "output"
OUT_HTML = OUT_DIR / "index.html"
OUT_ARTIFACT = OUT_DIR / "artifact.html"

# Order matters: shell first, shared helpers next, then tab modules.
JS_MODULES = [
    SRC / "shell.js",
    SRC / "tabs" / "_shared" / "ui.js",
    SRC / "tabs" / "overview" / "overview.js",
    SRC / "tabs" / "reps" / "reps.js",
    SRC / "tabs" / "brands" / "brands.js",
    SRC / "tabs" / "partners" / "partners.js",
    SRC / "tabs" / "counties" / "hu-counties-geo.js",
    SRC / "tabs" / "counties" / "counties.js",
    SRC / "tabs" / "brand_heatmap" / "brand_heatmap.js",
]


def _read(p: Path) -> str:
    if not p.exists():
        raise SystemExit(f"Missing source file: {p.relative_to(ROOT)}")
    return p.read_text(encoding="utf-8")


def _body_inner(shell_html: str) -> str:
    m = re.search(r"<body>(.*)</body>", shell_html, re.S)
    return m.group(1).strip() if m else shell_html


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

    def _fill(text: str) -> str:
        return (
            text.replace("/* __STYLES__ */", styles)
            .replace("/* __DATA__ */", data_block)
            .replace("/* __MODULES__ */", modules)
        )

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # 1) Standalone offline deliverable.
    OUT_HTML.write_text(_fill(shell), encoding="utf-8")

    # 2) Artifact variant: body content only + an inline <style> (the Artifact host
    #    provides <!doctype>/<head>/<body>). Same bundle; boots regardless of timing.
    artifact = (
        "<title>County Sales Dashboard (synthetic)</title>\n"
        f"<style>\n{styles}\n</style>\n"
        + _fill(_body_inner(shell))
    )
    OUT_ARTIFACT.write_text(artifact, encoding="utf-8")

    m = world["meta"]
    print(f"Wrote {OUT_HTML.relative_to(ROOT)} ({OUT_HTML.stat().st_size / 1024:,.0f} KB)")
    print(f"Wrote {OUT_ARTIFACT.relative_to(ROOT)} ({OUT_ARTIFACT.stat().st_size / 1024:,.0f} KB)")
    print(
        f"Baseline company 2026 YTD: {m['company_ytd_26']:,.0f}  |  "
        f"2025: {m['company_ytd_25']:,.0f}  |  plan: {m['company_plan']:,.0f}"
    )


if __name__ == "__main__":
    main()
