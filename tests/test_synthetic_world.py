"""Invariants on generated synthetic world."""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORLD = ROOT / "data" / "synthetic" / "world.json"
GEN = ROOT / "scripts" / "generate_synthetic_data.py"


def _ensure_world() -> dict:
    if not WORLD.exists():
        subprocess.check_call([sys.executable, str(GEN)])
    return json.loads(WORLD.read_text(encoding="utf-8"))


def test_world_exists_and_synthetic_flag():
    w = _ensure_world()
    assert w["meta"]["synthetic"] is True
    assert w["meta"]["seed"] == 20260815


def test_company_total_equals_sum_partners():
    w = _ensure_world()
    partner_sum = sum(sum(p["monthly"]["m26"]) for p in w["partners"])
    assert abs(partner_sum - w["meta"]["company_ytd_26"]) < 1.0


def test_company_total_equals_sum_counties():
    w = _ensure_world()
    county_sum = sum(c["ytd_26"] for c in w["counties"])
    assert abs(county_sum - w["meta"]["company_ytd_26"]) < 1.0


def test_deterministic_seed():
    subprocess.check_call([sys.executable, str(GEN)])
    a = json.loads(WORLD.read_text(encoding="utf-8"))["meta"]["company_ytd_26"]
    subprocess.check_call([sys.executable, str(GEN)])
    b = json.loads(WORLD.read_text(encoding="utf-8"))["meta"]["company_ytd_26"]
    assert a == b


def test_brand_shares_sum_to_one():
    w = _ensure_world()
    for p in w["partners"]:
        s = sum(p["brand_share"].values())
        assert abs(s - 1.0) < 1e-6
