# Govern formal v1.3.1 push readiness

## Goal

Freeze the forward-only sequence from completed R3 to a formally push-ready v1.3.1 branch while preserving every predecessor, failed assurance attempt, protected evidence object, unrelated dirty path, and operational authority boundary.

## Background

R3 is complete and locally committed:

- technical repair: `0028183901b74263a70dacca98bb936dc792ced4`, exactly 22 paths;
- task closure: `0037bc4261a08541c5b10085c7d8cb349f574711`, exactly five task records;
- base: `e6b80d640f0bd264c1acfe6bab906cb3e4ae535a`, with the current branch 26 commits ahead and zero behind.

T6 Attempts 1–3 remain immutable evidence. Attempt 3 failed and identified the defects corrected by R3. R3 is therefore only a predecessor suitable for a separately governed I3/S3 and fresh Attempt 4; it is not a T6 pass, T7 acceptance, archive authorization, or push authorization.

The user selected a formal migration push rather than an early transport-only backup. Formal push readiness requires a frozen I3/S3, a fresh passing Attempt 4, honest T6 reconciliation, a positive T7 decision, separately authorized archive/journal closeout, read-only remote freshness verification, and a final scoped push authorization.

## Requirements

1. Preserve the complete forward-only history from `e6b80d64`; never amend, reset, rebase, squash, stash, clean, force-push, or overwrite predecessor governance/evidence.
2. Preserve I1/S1, I2/S2, corrected T4 evidence, Attempts 1–3, Procedure history, `.trellis/research/**`, submodule gitlinks, and all protected historical objects.
3. Preserve the current unrelated `AGENTS.md` and `CLAUDE.md` bytes recorded in `task.json`; never stage, revert, reset, clean, or include them in a migration commit.
4. Own exactly the six standard files in this task directory. No technical, evidence, task-parent, submodule, workspace, or runtime file belongs to this governance commit.
5. Freeze the future order as `G-I3 -> M0-A4 -> M1-A4 -> T6-CLOSE -> O0 -> O1 -> G-AJ -> G-REMOTE-READ -> G-PUSH`.
6. Require a separately committed and activated stage-local authority before each future gate executes. Tree order, prior commits, this task, or a previous user instruction must not be treated as implicit later-stage authority.
7. Keep I3/S3 creation, reviewer preparation, assurance execution, T6 closure, T7 operator decision, archive/journal, remote reads, evidence transmission, and actual push as distinct decisions and commit boundaries.
8. If Attempt 4 fails or cannot produce authenticated exact-nine evidence, preserve it honestly and stop before T7.
9. If T7 rejects or is conditional, stop the formal push path until a new forward correction and re-verification satisfy the decision.
10. T7 must not imply archive, journal, remote, push, release, publication, or activation authority.
11. A future push may target only an explicitly named `origin` feature branch after read-only freshness and fast-forward checks, evidence-visibility approval, and a fresh G-PUSH authorization. No force-push or tag push is permitted.
12. Run GitNexus change detection and exact staged-set verification before committing this governance boundary.

## Acceptance Criteria

- [ ] Baseline authentication confirms R3, I1/I2, T3/T4, Attempts 1–3, Procedure, submodule, and protected-path identities or records any known inherited dirty divergence without modifying it.
- [ ] This task directory contains exactly `task.json`, `prd.md`, `design.md`, `implement.md`, `implement.jsonl`, and `check.jsonl`.
- [ ] The task authorizes only G-PRE-PUSH governance and later task creation; all future execution/operational authority flags remain false.
- [ ] The ordered future gates and their stop conditions are explicit and pairwise independent.
- [ ] Task validation and task activation succeed without changing technical or protected paths.
- [ ] The staged set equals the six owned paths exactly and GitNexus reports no unexpected symbol or execution-flow impact.
- [ ] The governance commit is a new descendant of `0037bc42` and does not push or contact a remote/provider.
- [ ] No code-spec update is made because this task changes no executable command, API, schema, environment, or cross-layer contract.

## Out of Scope

- Creating I3/S3 bytes or executing T5/T6 validation.
- Preparing or running Attempt 4.
- Provider/model selection or external data transmission.
- T6 closure or T7 activation/decision.
- Archive, journal identity, journal commit, remote reads, upstream setup, push, PR, tag, publication, release, or activation.
- Any edit to Core, CLI, tests, package scripts, existing task/evidence roots, submodules, `AGENTS.md`, or `CLAUDE.md`.

## Stop Conditions

Stop before commit on any unexpected dirty or staged path; immutable evidence drift; R3/predecessor mismatch; task inventory other than exactly six files; malformed or ambiguous authority; a future gate marked executable by this task; GitNexus HIGH/CRITICAL unexpected scope; failed validation; or any need for technical, provider, operator, archive, journal, network, push, release, publication, activation, or history-rewrite action.
