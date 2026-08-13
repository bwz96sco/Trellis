# G1 — Authorize forward-only Core v1.3.1 closure correction

## Goal

Create a standalone governance-only boundary whose `task.json` prospectively authorizes a distinct Core implementer to correct the accepted v1.3.1 closure-source family set in a separate task and commit before the existing T2 work resumes.

## Normative authority

`task.json` is the sole normative prospective authorization. The other five standard task files explain and validate that record.

## Requirements

### R1 — Forward-only return to Core

- Bind route source commit `b7c3c6645afb2d34c14548069bbaba61d060d5ee` and its rule: `T1-core-defect: return to T1; later stages cannot repair Core`.
- Bind completed defective T1 predecessor `05573ab1a37af3de66bfc6a797b1e35ba3c47cf3`.
- Do not rewrite the completed T1 task, its evidence, or historical commits.
- Keep this overlay standalone with `parent: null` and `children: []`; do not add a ninth campaign child.

### R2 — Exact prospective correction authority

After the governance boundary is separately committed, authorize only target actor `claude-t1-core-correction-implementer` to correct:

- path: `packages/core/src/research/methodology-reports.ts`
- symbol: `buildMethodologyReportV131`
- exact accepted `V131_CLOSURE_FAMILIES` values, in order:
  1. `research-literature`
  2. `research-ideation`
  3. `research-idea-evaluation`
  4. `research-experiment`

`research-quest` and `research-computation` must be rejected as v1.3.1 closure-source families.

### R3 — Separate minimal technical boundary

- Require a new standalone technical task at `.trellis/tasks/08-13-correct-core-v131-closure-families`.
- Keep the governance and technical commits distinct.
- Limit the technical commit to that task's six standard files plus:
  - `packages/core/src/research/methodology-reports.ts`
  - `packages/core/test/research/methodology-runtime.test.ts`
- No Core spec edit is required: the current Core specs do not encode the defective family list.
- If implementation discovers a real spec contradiction, stop for another forward-only governance decision rather than widening the inventory.

### R4 — Focused regression coverage

In `packages/core/test/research/methodology-runtime.test.ts`:

- add positive construction coverage for `research-ideation` and `research-idea-evaluation` closure sources;
- add negative rejection coverage for `research-quest` and `research-computation` closure sources;
- preserve existing report-v2 schema, digest, ordering, and sidecar tests.

### R5 — Impact and sequencing gate

- Record the latest fresh impact result for `buildMethodologyReportV131` as LOW: direct `2`, impacted `2`, processes `0`.
- Require the technical implementer to confirm fresh upstream impact after the governance commit and before editing.
- Stop if the refreshed result becomes HIGH or CRITICAL without new approval.
- Keep current T2 uncommitted work byte-preserved and blocked until the Core correction commit exists.
- After that commit, resume the existing T2 boundary without changing its authority or inventory.

### R6 — Preserve compatibility and denials

Preserve:

- historical v1.3.0 replay byte-for-byte;
- the exact accepted v1.3.1 semantics and semantic digest `sha256:8e2cd20dd8e12caab318852f82a100116a28d405113f654efbda7b3646f666af`;
- live Procedure `1.0.0` and dormant Procedure `2.0.7`;
- worker authority as Proposal-only;
- all denials for activation, live-selection change, provider execution, publication, release, push, archive, complete-system acceptance, worker-authority expansion, and later-stage execution.

## Acceptance criteria

- [ ] `task.json` is the sole normative prospective authorization.
- [ ] The standalone topology remains `parent: null`, `children: []`, with no campaign child added.
- [ ] The exact route source, T1 return rule, and defective predecessor are bound.
- [ ] Governance and technical actors, tasks, inventories, and commit boundaries are distinct.
- [ ] The exact four accepted closure families and two rejected families are normative.
- [ ] The technical inventory is exactly the separate task's six standard files plus the production and focused test paths; no spec path is authorized.
- [ ] Fresh post-governance GitNexus confirmation is required before the technical edit.
- [ ] Historical replay, accepted semantics/digest, Procedure states, Proposal-only worker authority, T2 work, and all operational denials are preserved.
- [ ] `task.py validate`, path-scoped diff checks, exact staging authentication, and staged no-production-impact verification pass at their respective boundaries.
- [ ] This implementation run performs no production edit, staging, or commit.

## Out of scope

- Performing the Core correction in this governance-authoring run
- Rewriting completed T1 task/evidence or accepted semantic artifacts
- Editing any Core spec under the current inventory
- Editing or discarding current T2 work before the Core correction commit
- Activation, live selection, provider execution, publication, release, push, archive, complete-system acceptance, or T3–T7 execution
