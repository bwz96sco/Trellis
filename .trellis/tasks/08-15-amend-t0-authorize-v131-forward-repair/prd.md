# T0A — Authorize v1.3.1 forward technical repair

## Goal

Preserve T6 MAL-1 Attempt-3 as immutable failed evidence, correct only the concrete T1–T5 defects it exposed, and produce a verified technical predecessor suitable for separately governed I3/S3 integration and a later Attempt-4.

## Normative authority

`task.json` is the sole normative authorization record. The other five standard files explain and validate that boundary.

## Confirmed failures

Attempt-3 commit `e311146a89a96e21e614304240c655245998e20f` recorded twelve findings while its exact-nine publication, containment, privacy, command inventory, and corrected runtime T4 interpretation passed. The actionable technical failures are:

1. `research-methodology-v131-coverage.test.ts` still rejects the 16 governed production-prevention rows because it requires code presence instead of the corrected OR rule.
2. Core lint has four migration-owned errors in three files.
3. CLI lint has twenty-three migration-owned errors in eight files.
4. Historical T5 `--verify` recaptures live protected state: the legacy path reads an intentionally untracked CS5 record, and the successor path requires an external worktree registration unavailable in a standalone archive.

The pnpm metadata-cache failure is a T6 reviewer defect and is not authorized by this task.

## Requirements

1. Keep Attempts 1–3, I1/S1, I2/S2, corrected T4 evidence, and every predecessor commit immutable.
2. Before editing an existing symbol, run GitNexus upstream impact analysis. Stop and warn on HIGH or CRITICAL risk.
3. Change only the exact repair paths in `task.json`.
4. Preserve `expectedCodesPresent` and `productionPrevented` as separate observations and accept a T4 row only when the actual outcome matches and either observation is true.
5. Apply only the identified Core and CLI lint corrections; do not perform adjacent cleanup or refactoring.
6. Make historical `--verify` authenticate retained audit records from pinned Git objects. It must not discover a live protected worktree, read the untracked CS5 source, or write historical evidence.
7. Prove historical verification from a committed archive without protected-worktree registration or the untracked CS5 file.
8. Run focused checks, full Core and CLI gates serially, workspace typecheck, and existing packed-package preflights before committing the technical repair.
9. Keep protected dirty paths and private source material outside every staged inventory.

## Exact inventories

- T0A owns exactly its six standard task files.
- R3 owns only the seventeen `governedRepairPaths` in `task.json`; a path may remain unchanged if inspection shows no edit is needed.
- The committed 116-row evidence file is read-only and outside R3.

## Acceptance criteria

- [ ] T0A commits exactly six files with no production-symbol impact.
- [ ] GitNexus reports no HIGH or CRITICAL target before an authorized edit.
- [ ] T4 reconciliation validates 116 rows, including the preserved 100 code-presence / 16 production-prevention split.
- [ ] Core lint, typecheck, tests, and build pass.
- [ ] CLI lint, typecheck, tests, and build pass.
- [ ] Workspace typecheck and packed Core/CLI preflights pass.
- [ ] Both historical audit scripts verify their exact retained records from a standalone committed archive.
- [ ] No historical evidence, production evidence, protected dirty path, private source, live selection, worker authority, provider, network, activation, publication, release, push, or T7 action changes.

## Out of scope

T6 reviewer repair, pnpm metadata seeding, I3/S3 production, another assurance run, generalized audit framework work, activation, technical-operator decision, publication, release, or push.
