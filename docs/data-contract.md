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
| `monthly.m26` / `m25` | number[12] | Index 0 = January |
| `weekly.weeks` | number[] | Same as meta.weeks |
| `weekly.w26` / `w25` | number[] | Parallel to weeks |
| `brand_share` | `{ [brandId]: number }` | Sums to 1.0 |

**Partner 2026 YTD** = `sum(monthly.m26)`.

### `counties[]`

| Field | Type | Notes |
|-------|------|--------|
| `id` / `name` | string | |
| `partner_count` | number | |
| `ytd_26` / `ytd_25` / `yoy` | number | Annual |
| `monthly.m26` / `m25` | number[12] | County sum of partners |
| `by_rep` | `{ [repId]: number }` | Annual 2026 |
| `by_brand` | `{ [brandId]: number }` | Annual 2026 (from partner brand_share × partner YTD) |

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

Tested in `tests/test_synthetic_world.py`.

---

## Grains available vs not (v1)

| Grain | Available |
|-------|-----------|
| partner × month | yes |
| partner × week | yes |
| county × month | yes (`counties[].monthly`) |
| county × rep annual | yes (`by_rep`) |
| county × brand annual | yes (`by_brand`) |
| county × brand × month | **no** — do not fabricate |
| county × rep × month | **no** — do not fabricate |
