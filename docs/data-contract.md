# DATA contract (`window.DATA`)

**Source of truth after build:** embedded JSON from `data/synthetic/world.json`.
**Producer:** `scripts/generate_synthetic_data.py` (seed `20260815`).

Implementers must not invent keys. Soft-ignore + UI note if a view needs a missing grain.

---

## Top level

```text
DATA = {
  meta: Meta,
  counties: County[],
  partners: Partner[],
  reps: { id, label }[],
  brands: { id, name }[],
}
```

### `meta`

| Field | Type | Notes |
|-------|------|--------|
| `seed` | number | `20260815` |
| `synthetic` | true | Always |
| `n_partners` | number | 180 |
| `n_counties` | number | 19 |
| `weeks` | number[] | ISO week numbers present (1–32 demo) |
| `grains` | string[] | Documented available grains |
| `company_ytd_26` | number | HUF-like units; sum of partner monthly m26 |
| `company_ytd_25` | number | Same for 2025 |
| `company_plan` | number | Sum of partner `plan_annual` |

### `partners[]`

| Field | Type | Notes |
|-------|------|--------|
| `id` | string | `P001` … |
| `name` | string | `Partner 001` … |
| `county_id` / `county_name` | string | Single county (v1) |
| `rep_id` / `rep_label` | string | |
| `plan_annual` | number | |
| `monthly.m26` / `m25` | number[12] | Index 0 = January; = sum of brands that month |
| `monthly_brand` | `{ [brandId]: { m26: number[12], m25: number[12] } }` | **partner × brand × month** |
| `weekly` | number[] | Parallel to `meta.weeks` (totals only; no brand×week yet) |
| `brand_share` | `{ [brandId]: number }` | Annual mix **derived** from monthly_brand; sums to 1.0 |

**Partner 2026 YTD** = `sum(monthly.m26)`.

### `counties[]`

| Field | Type | Notes |
|-------|------|--------|
| `id` / `name` | string | |
| `partner_count` | number | |
| `ytd_26` / `ytd_25` / `yoy` | number | Annual |
| `monthly.m26` / `m25` | number[12] | County sum of partners |
| `by_rep` | `{ [repId]: number }` | Annual 2026 |
| `by_brand` | `{ [brandId]: number }` | Annual 2026 (sum of monthly_brand) |
| `monthly_by_brand` | `{ [brandId]: { m26: number[12], m25: number[12] } }` | **county × brand × month** |

### Brands (synthetic, 3 majors + catch-all)

| id | name |
|----|------|
| ALPHA | Alpha Brand |
| BETA | Beta Brand |
| GAMMA | Gamma Brand |
| OTHER | Other Brands |

---

## Invariants (must hold)

1. `sum(partners YTD26) == meta.company_ytd_26` (±1)
2. `sum(counties.ytd_26) == meta.company_ytd_26` (±1)
3. Same seed → same `company_ytd_26`
4. Each `brand_share` sums to 1.0
5. For every partner/month: `sum_brands(monthly_brand[*].m26[m]) == monthly.m26[m]`
6. For every county/month: `sum_brands(monthly_by_brand[*].m26[m]) == monthly.m26[m]`

Tested in `tests/test_synthetic_world.py`.

---

## Grains (v0.3.1+)

Source model: line-level ERP facts (partner + brand + period + net) rolled up — same *shape* as weekly/daily exports, synthetic numbers only.

| Grain | Location | Notes |
|-------|----------|--------|
| partner × month | `partners[].monthly` | |
| **partner × brand × month** | `partners[].monthly_brand` | Honest brand+period filters |
| partner × week | `partners[].weekly` | Totals only |
| annual brand mix | `partners[].brand_share` | Derived |
| county × month | `counties[].monthly` | |
| county × brand (annual) | `counties[].by_brand` | |
| **county × brand × month** | `counties[].monthly_by_brand` | Map-ready |
| county × rep (annual) | `counties[].by_rep` | |
| county × rep × month | **no** | Soft-ignore / D-07 |
| partner × brand × week | **no** | Soft-ignore / D-07 |

**UI rule:** when brand **and** months are selected, aggregate from `monthly_brand` / `monthly_by_brand` — do **not** apply annual share as a proportional heuristic.
