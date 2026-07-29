# Design — F02 contract inventory

## Matrix rows

One row per package, plus expandable child rows for stages/outputs when needed. JSON is authoritative; CSV is export for review.

## Composition graph

Nodes = packages. Edge types:

- `handoff` — ordinary downstream consumption
- `composition` — source-defined bounded composition edge (exactly three must be identified from source docs; do not invent)

Quest edges:

- `research-quest` = read-only resume
- `research-quest-admin` = mutation owner

These two must remain distinct nodes with opposite write authority.

## Preliminary disposition

Not final. F06 re-decides with full evidence. F02 marks preliminary with evidence IDs and confidence.
