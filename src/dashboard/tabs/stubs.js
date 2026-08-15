/* Placeholder tabs for phases not yet implemented (P2–P4).
 *
 * These register real render fns so the shell's tab registry + pub/sub is
 * exercised end-to-end in P1 ("tab switch works"). Each is replaced in place
 * by its dedicated module in a later phase (see docs/claude-handoff.md):
 *   Reps / Brands / Partners -> P2   |   Counties -> P3   |   Brand heatmap -> P4
 */

function stubRenderer(title, phase, desc) {
  return function (state, panel) {
    panel.innerHTML = `<div class="stub">
      <h2>${title}</h2>
      <p>Planned for <strong>${phase}</strong>. ${desc}</p>
      <p>Global filters stay live across tabs; this view will read the same <code>window.DATA</code>.</p>
    </div>`;
  };
}

registerTab({ id: "reps", label: "Reps", soon: "P2" },
  stubRenderer("Reps table", "P2", "Reps with 2026 / 2025 / YoY, respecting global brand &amp; period where grain allows."));
registerTab({ id: "brands", label: "Brands", soon: "P2" },
  stubRenderer("Brands table", "P2", "Brand revenue table, respecting global rep &amp; period where grain allows."));
registerTab({ id: "partners", label: "Partners", soon: "P2" },
  stubRenderer("Partners table", "P2", "Searchable partner table with global rep &amp; brand filters."));
registerTab({ id: "counties", label: "Counties", soon: "P3" },
  stubRenderer("Counties map + drill", "P3", "Reactive HU county choropleth with per-county drill (KPI, brand cards, partners)."));
registerTab({ id: "brand_heatmap", label: "Brand heatmap", soon: "P4" },
  stubRenderer("Brand heatmap", "P4", "Brand chips recolor the county map by annual brand revenue."));
