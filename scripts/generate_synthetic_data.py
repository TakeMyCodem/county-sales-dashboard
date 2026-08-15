#!/usr/bin/env python3
"""Generate deterministic synthetic sales data for the portfolio dashboard.

Seed is fixed so totals are stable across machines (interview demos).
No real CRM/ERP input — public-repo safe.
"""
from __future__ import annotations

import json
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "synthetic"
SEED = 20260815

COUNTIES = [
    ("BU", "Budapest"),
    ("PE", "Pest"),
    ("FE", "Fejér"),
    ("GY", "Győr-Moson-Sopron"),
    ("HA", "Hajdú-Bihar"),
    ("BA", "Baranya"),
    ("SO", "Somogy"),
    ("SZ", "Szabolcs-Szatmár-Bereg"),
    ("TO", "Tolna"),
    ("VE", "Veszprém"),
    ("ZA", "Zala"),
    ("BE", "Békés"),
    ("BN", "Borsod-Abaúj-Zemplén"),
    ("CS", "Csongrád-Csanád"),
    ("HE", "Heves"),
    ("JN", "Jász-Nagykun-Szolnok"),
    ("KO", "Komárom-Esztergom"),
    ("NO", "Nógrád"),
    ("VA", "Vas"),
]

REPS = [
    ("RA", "Rep Alpha"),
    ("RB", "Rep Bravo"),
    ("RC", "Rep Charlie"),
    ("RD", "Rep Delta"),
    ("RE", "Rep Echo"),
]

BRANDS = [
    ("BNZ", "Brand North"),
    ("CXP", "Brand Core"),
    ("WIZ", "Brand West"),
    ("OTR", "Brand Other"),
]

N_PARTNERS = 180
WEEKS = list(range(1, 33))


def _month_weights() -> list[float]:
    raw = [0.6, 0.7, 0.9, 1.0, 1.1, 1.2, 1.15, 1.05, 0.95, 0.85, 0.75, 0.7]
    s = sum(raw)
    return [x / s for x in raw]


def _normalized_shares(shares: dict[str, float], ndigits: int = 4) -> dict[str, float]:
    keys = list(shares.keys())
    rounded = {k: round(shares[k], ndigits) for k in keys}
    drift = round(1.0 - sum(rounded.values()), ndigits)
    rounded[keys[-1]] = round(rounded[keys[-1]] + drift, ndigits)
    return rounded


def main() -> None:
    rng = random.Random(SEED)
    OUT.mkdir(parents=True, exist_ok=True)
    mw = _month_weights()

    partners = []
    for i in range(1, N_PARTNERS + 1):
        cid, cname = COUNTIES[rng.randrange(len(COUNTIES))]
        rid, rlabel = REPS[rng.randrange(len(REPS))]
        annual_26 = rng.uniform(0.5e6, 25e6)
        growth = rng.uniform(0.85, 1.25)
        annual_25 = annual_26 / growth
        m26 = [annual_26 * w * rng.uniform(0.9, 1.1) for w in mw]
        m25 = [annual_25 * w * rng.uniform(0.9, 1.1) for w in mw]
        scale26 = annual_26 / max(sum(m26), 1)
        scale25 = annual_25 / max(sum(m25), 1)
        m26 = [x * scale26 for x in m26]
        m25 = [x * scale25 for x in m25]

        brand_share = [rng.random() for _ in BRANDS]
        bs = sum(brand_share)
        brand_share = [x / bs for x in brand_share]

        weekly_26 = []
        weekly_25 = []
        for _w in WEEKS:
            weekly_26.append(annual_26 / 52 * rng.uniform(0.7, 1.3))
            weekly_25.append(annual_25 / 52 * rng.uniform(0.7, 1.3))

        plan = annual_26 * rng.uniform(0.9, 1.15)

        partners.append(
            {
                "id": f"P{i:03d}",
                "name": f"Partner {i:03d}",
                "county_id": cid,
                "county_name": cname,
                "rep_id": rid,
                "rep_label": rlabel,
                "plan_annual": round(plan, 2),
                "monthly": {
                    "m26": [round(x, 2) for x in m26],
                    "m25": [round(x, 2) for x in m25],
                },
                "weekly": {
                    "weeks": WEEKS,
                    "w26": [round(x, 2) for x in weekly_26],
                    "w25": [round(x, 2) for x in weekly_25],
                },
                "brand_share": _normalized_shares(
                    {BRANDS[j][0]: brand_share[j] for j in range(len(BRANDS))}
                ),
            }
        )

    counties = []
    for cid, cname in COUNTIES:
        ps = [p for p in partners if p["county_id"] == cid]
        t26 = sum(sum(p["monthly"]["m26"]) for p in ps)
        t25 = sum(sum(p["monthly"]["m25"]) for p in ps)
        m26 = [sum(p["monthly"]["m26"][i] for p in ps) for i in range(12)]
        m25 = [sum(p["monthly"]["m25"][i] for p in ps) for i in range(12)]
        by_rep: dict[str, float] = {}
        for p in ps:
            by_rep[p["rep_id"]] = by_rep.get(p["rep_id"], 0.0) + sum(p["monthly"]["m26"])
        by_brand: dict[str, float] = {b[0]: 0.0 for b in BRANDS}
        for p in ps:
            tot = sum(p["monthly"]["m26"])
            for b, sh in p["brand_share"].items():
                by_brand[b] += tot * sh
        counties.append(
            {
                "id": cid,
                "name": cname,
                "partner_count": len(ps),
                "ytd_26": round(t26, 2),
                "ytd_25": round(t25, 2),
                "yoy": round(t26 / t25 - 1, 4) if t25 else None,
                "monthly": {"m26": [round(x, 2) for x in m26], "m25": [round(x, 2) for x in m25]},
                "by_rep": {k: round(v, 2) for k, v in by_rep.items()},
                "by_brand": {k: round(v, 2) for k, v in by_brand.items()},
            }
        )

    company_26 = sum(c["ytd_26"] for c in counties)
    company_25 = sum(c["ytd_25"] for c in counties)
    company_plan = sum(p["plan_annual"] for p in partners)

    meta = {
        "seed": SEED,
        "generated_for": "county-sales-dashboard portfolio",
        "synthetic": True,
        "n_partners": N_PARTNERS,
        "n_counties": len(COUNTIES),
        "weeks": WEEKS,
        "company_ytd_26": round(company_26, 2),
        "company_ytd_25": round(company_25, 2),
        "company_plan": round(company_plan, 2),
    }

    payload = {
        "meta": meta,
        "counties": counties,
        "partners": partners,
        "reps": [{"id": a, "label": b} for a, b in REPS],
        "brands": [{"id": a, "name": b} for a, b in BRANDS],
    }

    out_path = OUT / "world.json"
    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {out_path}")
    print(
        f"Company 2026 YTD: {meta['company_ytd_26']:,.0f}  |  "
        f"2025: {meta['company_ytd_25']:,.0f}  |  plan: {meta['company_plan']:,.0f}"
    )


if __name__ == "__main__":
    main()
