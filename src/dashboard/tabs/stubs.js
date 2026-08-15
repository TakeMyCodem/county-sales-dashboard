/* Placeholder tabs for phases not yet implemented.
 *
 * These register real render fns so the shell's tab registry + pub/sub is
 * exercised end-to-end. Each is replaced in place by its dedicated module in a
 * later phase (see docs/claude-handoff.md):  Brand heatmap -> P4
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

registerTab({ id: "brand_heatmap", label: "Brand heatmap", soon: "P4" },
  stubRenderer("Brand heatmap", "P4", "Brand chips recolor the county map by annual brand revenue."));
