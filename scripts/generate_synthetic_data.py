#!/usr/bin/env python3
"""Generate deterministic synthetic sales data for the portfolio dashboard.

Models line-level ERP grain (month/week + partner + brand + net) rolled up to
aggregates the UI needs — including:
  partner × brand × month, partner × brand × week,
  county × brand × month, county × rep × month.

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
    ("BK", "Bács-Kiskun"),
]

REPS = [
    ("RA", "Rep Alpha"),
    ("RB", "Rep Bravo"),
    ("RC", "Rep Charlie"),
    ("RD", "Rep Delta"),
    ("RE", "Rep Echo"),
]

BRANDS = [
    ("ALPHA", "Alpha Brand"),
    ("BETA", "Beta Brand"),
    ("GAMMA", "Gamma Brand"),
    ("OTHER", "Other Brands"),
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


def _split_total_across_brands(
    total: float, mean_share: list[float], rng: random.Random
) -> list[float]:
    """Split a period total across brands; slight noise around mean share, sum exact."""
    if total <= 0:
        return [0.0] * len(mean_share)
    noisy = [max(0.02, s * rng.uniform(0.75, 1.25)) for s in mean_share]
    s = sum(noisy)
    parts = [total * (x / s) for x in noisy]
    parts[-1] = total - sum(parts[:-1])
    return parts


def main() -> None:
    rng = random.Random(SEED)
    OUT.mkdir(parents=True, exist_ok=True)
    mw = _month_weights()
    brand_ids = [b[0] for b in BRANDS]
    n_weeks = len(WEEKS)

    # Per-county plan pressure so plan attainment (2026 ÷ plan) spreads across the
    # 5-level RAG on the map. Without it, county aggregates cluster ~90–100% and the
    # choropleth is a single amber band. Range spans <75% … ≥120%.
    county_attain = {cid: rng.uniform(0.72, 1.25) for cid, _ in COUNTIES}

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

        raw_bs = [rng.random() for _ in BRANDS]
        sbs = sum(raw_bs) or 1.0
        mean_share = [x / sbs for x in raw_bs]

        mb26 = {bid: [] for bid in brand_ids}
        mb25 = {bid: [] for bid in brand_ids}
        for mi in range(12):
            for bid, val in zip(brand_ids, _split_total_across_brands(m26[mi], mean_share, rng)):
                mb26[bid].append(val)
            for bid, val in zip(brand_ids, _split_total_across_brands(m25[mi], mean_share, rng)):
                mb25[bid].append(val)

        m26 = [sum(mb26[bid][mi] for bid in brand_ids) for mi in range(12)]
        m25 = [sum(mb25[bid][mi] for bid in brand_ids) for mi in range(12)]
        annual_26 = sum(m26)
        annual_25 = sum(m25)

        brand_year = {bid: sum(mb26[bid]) for bid in brand_ids}
        brand_share = _normalized_shares(
            {bid: (brand_year[bid] / annual_26 if annual_26 else 0.0) for bid in brand_ids}
        )

        week_w26 = [rng.uniform(0.7, 1.3) for _ in range(n_weeks)]
        week_w25 = [rng.uniform(0.7, 1.3) for _ in range(n_weeks)]
        s26w, s25w = sum(week_w26), sum(week_w25)
        w26 = [annual_26 * (x / s26w) for x in week_w26]
        w25 = [annual_25 * (x / s25w) for x in week_w25]

        wb26 = {bid: [] for bid in brand_ids}
        wb25 = {bid: [] for bid in brand_ids}
        for wi in range(n_weeks):
            for bid, val in zip(brand_ids, _split_total_across_brands(w26[wi], mean_share, rng)):
                wb26[bid].append(val)
            for bid, val in zip(brand_ids, _split_total_across_brands(w25[wi], mean_share, rng)):
                wb25[bid].append(val)
        w26 = [sum(wb26[bid][wi] for bid in brand_ids) for wi in range(n_weeks)]
        w25 = [sum(wb25[bid][wi] for bid in brand_ids) for wi in range(n_weeks)]

        plan = annual_26 / (county_attain[cid] * rng.uniform(0.95, 1.05))

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
                "monthly_brand": {
                    bid: {
                        "m26": [round(x, 2) for x in mb26[bid]],
                        "m25": [round(x, 2) for x in mb25[bid]],
                    }
                    for bid in brand_ids
                },
                "weekly": {
                    "w26": [round(x, 2) for x in w26],
                    "w25": [round(x, 2) for x in w25],
                },
                "weekly_brand": {
                    bid: {
                        "w26": [round(x, 2) for x in wb26[bid]],
                        "w25": [round(x, 2) for x in wb25[bid]],
                    }
                    for bid in brand_ids
                },
                "brand_share": brand_share,
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
        monthly_by_rep: dict[str, dict[str, list[float]]] = {}
        by_brand: dict[str, float] = {b[0]: 0.0 for b in BRANDS}
        monthly_by_brand: dict[str, dict[str, list[float]]] = {
            bid: {"m26": [0.0] * 12, "m25": [0.0] * 12} for bid in brand_ids
        }
        for p in ps:
            rid = p["rep_id"]
            by_rep[rid] = by_rep.get(rid, 0.0) + sum(p["monthly"]["m26"])
            if rid not in monthly_by_rep:
                monthly_by_rep[rid] = {"m26": [0.0] * 12, "m25": [0.0] * 12}
            for mi in range(12):
                monthly_by_rep[rid]["m26"][mi] += p["monthly"]["m26"][mi]
                monthly_by_rep[rid]["m25"][mi] += p["monthly"]["m25"][mi]
            for bid in brand_ids:
                by_brand[bid] += sum(p["monthly_brand"][bid]["m26"])
                for mi in range(12):
                    monthly_by_brand[bid]["m26"][mi] += p["monthly_brand"][bid]["m26"][mi]
                    monthly_by_brand[bid]["m25"][mi] += p["monthly_brand"][bid]["m25"][mi]
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
                "monthly_by_rep": {
                    rid: {
                        "m26": [round(x, 2) for x in series["m26"]],
                        "m25": [round(x, 2) for x in series["m25"]],
                    }
                    for rid, series in monthly_by_rep.items()
                },
                "by_brand": {k: round(v, 2) for k, v in by_brand.items()},
                "monthly_by_brand": {
                    bid: {
                        "m26": [round(x, 2) for x in monthly_by_brand[bid]["m26"]],
                        "m25": [round(x, 2) for x in monthly_by_brand[bid]["m25"]],
                    }
                    for bid in brand_ids
                },
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
        "grains": [
            "partner×month",
            "partner×brand×month",
            "partner×week",
            "partner×brand×week",
            "county×month",
            "county×brand×month",
            "county×rep×month",
            "county×rep (annual)",
            "county×brand (annual)",
        ],
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
    size_mb = out_path.stat().st_size / (1024 * 1024)
    print(f"Wrote {out_path} ({size_mb:.2f} MB)")
    print(
        f"Company 2026 YTD: {meta['company_ytd_26']:,.0f}  |  "
        f"2025: {meta['company_ytd_25']:,.0f}  |  plan: {meta['company_plan']:,.0f}"
    )


if __name__ == "__main__":
    main()
