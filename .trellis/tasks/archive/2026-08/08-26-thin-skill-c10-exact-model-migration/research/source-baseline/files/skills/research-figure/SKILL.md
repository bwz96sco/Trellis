---
name: research-figure
description: Create, revise, audit, or integrate evidence-bearing research figures, plots, diagrams, and captions from traceable sources. Use for paper or slide figures, reproducible plots, figure audits, and caption bounds.
---

# Research Figure

Turn traceable evidence into a bounded display: every value, arrow, and caption claim comes from source data or evidence — never invented.

## Workflow

1. **Lock the contract.** Operation (create, revise, audit, integrate), reader job, the bounded claim the figure carries, source evidence, target surface (paper or slide), and format.
2. **Choose the deterministic route first.** Project plotting and LaTeX scripts take precedence; then matplotlib, SVG, TikZ, or Mermaid whenever exact labels, data, topology, or geometry can be expressed directly. Route AI illustration or style transfer to `autofigure-edit`, result-data boundaries to `research-experiment`, narrative to `research-writing`.
3. **Build from source data.** Plots and tables come from the actual data files, with the reproducible generation script kept next to the asset. Diagrams come from an editable source or structured spec. For paired or blocked comparisons keep pairing IDs; state `n`, units, center/spread, and metric definitions.
4. **Inspect the render.** Script success or valid format never establishes visual correctness. Check readability at target scale, clipping, labels, hierarchy, and fidelity to source values. No render, no inspection claim.
5. **Bound the caption.** What is shown, what to notice, the bounded takeaway, scope limits. A caption adds no claim the evidence does not support.

Complete when the asset or audit is delivered or blocked, source and claim boundaries are visible, the generation route is reproducible, and the render was actually inspected when one exists.

## Rules

- Durable figure work: `note/<vault>/figures/<slug>/` when the workspace has `note/<vault>/`, else `artifacts/research-figure/<slug>/`; final assets live in the paper repo.
- Prefer vector for plots and formal diagrams; raster only for photos, screenshots, or generated imagery.
- Failed renders and failed checks stay visible; never hide them with design.
- When `research-quest.yaml` governs the project and durable figure evidence changed, prepare one event, tell the user to invoke `$research-quest-admin` explicitly, then stop; this skill never writes quest state.
