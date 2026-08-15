"""Invariant tests for the synthetic world generator."""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GEN = ROOT / "scripts" / "generate_synthetic_data.py"
WORLD = ROOT / "data" / "synthetic" / "world.json"


def _ensure_world():
    if not WORLD.exists():
        subprocess.check_call([sys.executable, str(GEN)])
    return json.loads(WORLD.read_text(encoding="utf-8"))


def test_meta_and_counts():
    w = _ensure_world()
    assert w["meta"]["synthetic"] is True
    assert w["meta"]["n_partners"] == len(w["partners"]) == 180
    assert w["meta"]["n_counties"] == len(w["counties"]) == 19
    assert "partner×brand×month" in w["meta"]["grains"]


def test_company_ytd_matches_partners_and_counties():
    w = _ensure_world()
    from_partners = sum(sum(p["monthly"]["m26"]) for p in w["partners"])
    from_counties = sum(c["ytd_26"] for c in w["counties"])
    assert abs(from_partners - w["meta"]["company_ytd_26"]) < 1.0
    assert abs(from_counties - w["meta"]["company_ytd_26"]) < 1.0


def test_brand_shares_sum_to_one():
    w = _ensure_world()
    for p in w["partners"]:
        s = sum(p["brand_share"].values())
        assert abs(s - 1.0) < 1e-6


def test_partner_brand_month_sums_to_monthly():
    """ERP honesty: sum over brands of monthly_brand == monthly total per month."""
    w = _ensure_world()
    for p in w["partners"]:
        brands = list(p["monthly_brand"].keys())
        for mi in range(12):
            s26 = sum(p["monthly_brand"][b]["m26"][mi] for b in brands)
            s25 = sum(p["monthly_brand"][b]["m25"][mi] for b in brands)
            assert abs(s26 - p["monthly"]["m26"][mi]) < 0.05
            assert abs(s25 - p["monthly"]["m25"][mi]) < 0.05


def test_brand_share_derived_from_monthly_brand():
    w = _ensure_world()
    for p in w["partners"]:
        year = sum(p["monthly"]["m26"])
        if year <= 0:
            continue
        for bid, sh in p["brand_share"].items():
            expected = sum(p["monthly_brand"][bid]["m26"]) / year
            assert abs(sh - expected) < 1e-3


def test_county_monthly_by_brand_sums_to_monthly():
    w = _ensure_world()
    for c in w["counties"]:
        brands = list(c["monthly_by_brand"].keys())
        for mi in range(12):
            s = sum(c["monthly_by_brand"][b]["m26"][mi] for b in brands)
            assert abs(s - c["monthly"]["m26"][mi]) < 0.5


def test_seed_stable():
    a = json.loads(WORLD.read_text(encoding="utf-8"))["meta"]["company_ytd_26"]
    subprocess.check_call([sys.executable, str(GEN)])
    b = json.loads(WORLD.read_text(encoding="utf-8"))["meta"]["company_ytd_26"]
    assert a == b
