# CS4 path ownership map (additive)

Status: CS4-0 governance only. Does not grant edit authority until each child is separately activated.

## Rules

1. Only the named CS4 child may edit its listed production/test/task paths while active.
2. Procedure **2.0.4** and earlier package bytes are immutable; corrections use **2.0.5**.
3. Historical CS3/OA task evidence is read-only; add only forward supersession pointers.
4. Unrelated dirty paths excluded: `AGENTS.md`, `CLAUDE.md`, `docs-site`, `marketplace`.
5. HIGH/CRITICAL shared schema/event/reducer/store/lock/publication primitives remain call-only.
6. CS4-6 output commit may contain **exactly** the nine files listed in `cs4-mal1-nine-file-output-allowlist.json` — no task.json.

## CS4-0 — governance (this task)

- `.trellis/tasks/08-05-cs4-supersede-stale-complete-system-assurance/**`
- Parent additive overlays under `.trellis/tasks/07-29-migrate-research-methodology-to-procedures/{prd,design,implement}.md` and `research/path-ownership-map.md`
- Optional forward supersession pointers on historical CS3/OA `task.json` meta only (no status rewrite)

## CS4-1/2 — runtime repair

- `packages/cli/src/commands/research/dispatch-command.ts`
- `packages/cli/src/commands/research/dispatch-methodology-validation.ts`
- `packages/core/src/research/methodology-v13-runtime.ts`
- `packages/core/src/research/methodology-artifacts.ts`
- `packages/core/src/research/methodology-validators.ts`
- `packages/core/src/research/methodology-reports.ts`
- `packages/core/src/research/index.ts`
- Focused Core/CLI tests for closure, lifecycle, validators, pack identity, report-v2
- `.trellis/tasks/08-05-cs4-remediate-canonical-closure-runtime/**`

## CS4-3 — Procedure 2.0.5 packages

- `packages/cli/src/templates/research/procedures/*/2.0.5/**` (new only)
- `.trellis/tasks/08-05-cs4-procedure-2.0.5-family-packages/**`
- **Forbidden:** any `*/2.0.4/**` content change

## CS4-4 — harness / evidence

- `packages/cli/test/research-methodology-harness/**`
- `.trellis/tasks/08-05-cs4-remediate-v13-delta-harness-evidence/**`

## CS4-5 — dormant integrate + subject freeze

- `.trellis/tasks/08-05-cs4-integrate-v13-dormant-candidate-2.0.5/**`

## CS4-6 — MAL-1 outputs only

- `.trellis/tasks/08-05-cs4-assure-complete-system-mal1/research/` + exactly the nine allowlisted filenames

## CS4-7 — operator decision only

- `.trellis/tasks/08-05-cs4-accept-complete-system-machine-assurance/**` decision records

## Unchanged

Live 1.0.0 selection, quarantined 2.0.3, immutable 2.0.4, portable C0, Wave-7 archives, `.trellis/research/**`, A3 public leaves.
