# T0A — Authorize exact CRITICAL CLI Procedure 2.0.7 routing

## Goal

Create a standalone, forward-only governance amendment whose `task.json` prospectively authorizes the existing T2 actor to make one narrowly defined CRITICAL-impact edit in `parseSelectedProcedure`. Preserve the committed G0/T0 governance, the eight-child campaign topology, the exact 32-path T2 inventory, historical Procedure interpretation, and all operational denials.

## Normative authority

`task.json` is the sole normative T0A authorization record. The other five standard task files explain and validate that record.

## Requirements

### R1 — Standalone forward-only overlay

- Keep `parent: null` and `children: []`.
- Link the standalone amendment to the governed campaign, original T0, and target T2 in `task.json`.
- Do not add a ninth campaign child or modify committed campaign topology.
- Incorporate the existing G0/T0 governance and T2 implementation/impact records by reference without rewriting them.

### R2 — Exact prospective authority

Clear the recorded CRITICAL stop reason only for the future T2 actor `claude-t2-cli-implementer` to make this exact change:

- path: `packages/cli/src/commands/research/procedure-resolution.ts`
- symbol: `parseSelectedProcedure`
- supporting edit: same-file named import of `parseAcceptedV131ResearchProcedure` from `@mindfoldhq/trellis-core/research`
- route: all three conditions must hold — activation-recorded context, recorded Procedure version `2.0.7`, and package schema version `2`
- action: pass the already-read parser input to Core `parseAcceptedV131ResearchProcedure`
- fallback: every other Procedure identity continues through `parseResearchProcedure`

The authorization must not generalize to all schema-v2 Procedures, all `2.x` Procedures, the registry-current Procedure, or support-pack-only inference.

### R3 — Preserve resolution and replay behavior

Preserve:

- project-first Procedure resolution
- bundled fallback only when the exact project candidate is absent
- present-invalid project content failing closed without fallback
- recorded Procedure identity as historical replay authority
- generic parsing for live `1.0.0` and Procedures `2.0.0` through `2.0.6`
- live selection exactly `1.0.0`
- dormant status of `2.0.7`
- Core as the only v1.3.1 Procedure parser authority

### R4 — Preserve scope and ownership

- T0A owns only its six standard files: `task.json`, `prd.md`, `design.md`, `implement.md`, `implement.jsonl`, and `check.jsonl`.
- Keep the T2 inventory exactly 32 paths with canonical digest `69c3d0c326f7a71e8422f3ec427240c1bf429c23839d7cc642f0af2c9800d786`.
- Do not modify T2, production, tests, specifications, Procedure packages, historical files, committed G0/T0 records, or unrelated dirty paths.

### R5 — Preserve operational denials

T0A grants only task execution, the T0A-only commit boundary, and prospective approval for the exact CRITICAL T2 delta. It grants no production implementation by T0A, Core edit, activation, live-selection change, Procedure package projection, provider execution, publication, release, push, archive, repair, complete-system acceptance, worker-authority expansion, or T3–T7 execution authority.

## Acceptance criteria

- [ ] `task.json` records the approval and sets `taskExecutionAuthorized`, T0A-only `commitAuthorized`, and `criticalImpactApprovalAuthorized` to `true`.
- [ ] The exact target actor, path, symbol, same-file import, three-part route, and generic fallback are normative in `task.json`.
- [ ] Project-first, fail-closed, historical replay, live `1.0.0`, dormant `2.0.7`, and Core parser authority are preserved.
- [ ] The standalone topology and existing eight-child campaign remain unchanged.
- [ ] The T2 32-path inventory and digest remain unchanged.
- [ ] Only the six standard T0A files change.
- [ ] Task validation and path-scoped `git diff --check` pass.
- [ ] No staging or commit occurs during this implementation run.

## Out of scope

- Editing `parseSelectedProcedure` or any other production symbol
- Editing Core, tests, specifications, T2 artifacts, or Procedure packages
- Activating or selecting Procedure `2.0.7`
- Executing T3–T7 or any provider, publication, release, archive, push, or complete-system operation
