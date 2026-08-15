"""Hardening tests (P5): public-repo hygiene, map/data integrity, build output.

These complement the generator invariants in test_synthetic_world.py — they guard
the risks specific to this portfolio: leaking real-company strings, the county map
drifting out of sync with the data, and the build losing a tab or the DATA blob.
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GEN = ROOT / "scripts" / "generate_synthetic_data.py"
BUILD = ROOT / "scripts" / "build.py"
WORLD = ROOT / "data" / "synthetic" / "world.json"
GEO = ROOT / "src" / "dashboard" / "tabs" / "counties" / "hu-counties-geo.js"
OUT = ROOT / "output" / "index.html"

# Real project/company identifiers that must never appear in this public repo (D-01).
FORBIDDEN = ["energofish", "vadászlaki", "vadaszlaki", "dyntell", "mcs_local", "marcali", "energofish-ops"]

# Tracked text locations to scan (generated data/output are gitignored and excluded).
SCAN_DIRS = ["src", "docs", "scripts", "tests"]
SCAN_FILES = ["README.md", "VERSION", ".gitignore"]
TEXT_SUFFIXES = {".js", ".py", ".md", ".html", ".css", ".txt", ""}


SELF = Path(__file__).resolve()  # this scanner defines the denylist — don't scan it


def _iter_text_files():
    for d in SCAN_DIRS:
        for p in (ROOT / d).rglob("*"):
            if p.is_file() and p.suffix.lower() in TEXT_SUFFIXES and p.resolve() != SELF:
                yield p
    for f in SCAN_FILES:
        p = ROOT / f
        if p.exists():
            yield p


def test_no_forbidden_company_tokens():
    hits = []
    for p in _iter_text_files():
        text = p.read_text(encoding="utf-8", errors="ignore").lower()
        for tok in FORBIDDEN:
            if tok in text:
                hits.append(f"{p.relative_to(ROOT)}: {tok}")
    assert not hits, "Forbidden real-company tokens found:\n" + "\n".join(hits)


def _ensure_world() -> dict:
    if not WORLD.exists():
        subprocess.check_call([sys.executable, str(GEN)])
    return json.loads(WORLD.read_text(encoding="utf-8"))


def test_map_geo_ids_match_data():
    """Every map county id has data and vice-versa — no silent grey regions / drift."""
    w = _ensure_world()
    data_ids = {c["id"] for c in w["counties"]}
    geo_ids = set(re.findall(r'id:\s*"([A-Z]{2})"', GEO.read_text(encoding="utf-8")))
    assert geo_ids == data_ids, f"map vs data mismatch: only-map={geo_ids - data_ids}, only-data={data_ids - geo_ids}"
    assert len(geo_ids) == 20


def test_build_embeds_data_and_all_tabs():
    """build.py yields an offline page with window.DATA and all six real tabs."""
    _ensure_world()
    subprocess.check_call([sys.executable, str(BUILD)])
    html = OUT.read_text(encoding="utf-8")
    assert "window.DATA" in html
    assert '"synthetic": true' in html or '"synthetic":true' in html
    for tab in ["overview", "reps", "brands", "partners", "counties", "brand_heatmap"]:
        assert f'id: "{tab}"' in html, f"tab not registered in build: {tab}"
    # No leftover placeholder tabs.
    assert "stubRenderer" not in html
