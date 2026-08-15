# Design decisions

Lightweight ADR-style log for the portfolio product.

---

## D-01 — Synthetic-only data

**Decision:** All demo data is generated with a fixed seed. No production CRM/ERP files.
**Why:** Public GitHub + job applications must not leak employer or customer data.
**Consequence:** Numbers are plausible but fictional; README states this clearly.

---

## D-02 — Client-side filtering

**Decision:** Filters re-aggregate in the browser from a single DATA blob.
**Why:** Zero infra cost; easy to host on GitHub Pages.
**Consequence:** Payload size must stay modest (~few MB). Generator caps partner count.

---

## D-03 — Dual global period, XOR on map

**Decision:**

- Global bar: **months AND weeks** selectable independently.
- County map: **month XOR week** via a local toggle (which global Set paints the map).

**Why:** Tables can show both panes; a single choropleth cannot honestly show week∩month without a combined grain.
**Consequence:** UI must label map mode; switching kind does not clear global Sets.

---

## D-04 — No fabricated cubes (amended 2026-08-15)

**Decision:** Do not invent grains by silent proportional splits.

**Amendment (0.3.1):** The generator **does** emit real `partner × brand × month` and `county × brand × month`, modeled on ERP line facts (partner + Márka + period + nettó). Annual `brand_share` is derived from that series.

**Still missing / soft-ignore:** `county × rep × month` and `partner × brand × week` — not fabricated; views must soft-ignore or show a note (D-07).

**UI consequence:** Brand + month filters must aggregate from `monthly_brand` / `monthly_by_brand`. The old “annual share × selected months” heuristic is **retired** where the new grain exists.
**Why:** Matches real weekly/daily export shape without shipping employer data.

---

## D-05 — Default = baseline

**Decision:** Clearing filters restores the same totals as first load.
**Why:** Regression gate for every filter feature.
**Consequence:** Tests assert company/county baseline invariants.

---

## D-06 — Single static HTML deliverable

**Decision:** `build.py` produces openable `output/index.html` (inline or adjacent data).
**Why:** One artifact for demos and GitHub Pages.
**Consequence:** Implementer keeps shell/tabs modular in `src/` even if bundled.

---

## D-07 — Visible limits

**Decision:** When a view is degraded (e.g. no week-county grain), show a short note in the UI.
**Why:** Trust.
**Consequence:** Empty grey map + message beats silent zeros.
