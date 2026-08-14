# T0A — Authorize T6 MAL-1 Attempt-3

## Goal

Preserve Attempts 1 and 2 as immutable failed evidence, bind assurance to corrected S2/I2, add bounded actionable failure diagnostics, and authorize one forward-only Attempt-3.

## Normative authority

`task.json` is the sole normative authorization record. The other five standard files explain and validate that boundary.

## Confirmed failures

Attempt-2 commit `1d389f31cb584ffbab3acb583c4810e7676c7b46` is failed and non-authoritative. Its command ledger retained status and exit code but discarded stdout/stderr, while blocked downstream commands omitted their failed prerequisite. It therefore could not distinguish a technical defect from an assurance-harness prerequisite failure. Separately, corrected T4 commit `e7ed93f6b8d2bcb4711715a080ec2984119848bb` and successor T5 freeze S2 `a2a4ea08bf65cea22a976078aaae104ddb5c4019` supersede the old S1 subject.

## Requirements

1. Keep every Attempt-1 and Attempt-2 byte and commit immutable.
2. Correct only the existing three T6 M0 files.
3. Bind the reviewer to exact S2, its I2 subject, corrected T4, and the new Attempt-3 governance commit.
4. Capture bounded stdout/stderr diagnostics only for failed, timed-out, or launch-failed commands, with truncation metadata and a stable digest identifier; do not expose private paths, home paths, credentials, or private-source bytes.
5. Give every blocked command an explicit prerequisite reason and report the aggregate blocked reason when one exists.
6. Preserve `expectedCodesPresent` and `productionPrevented` as separate T4 observations; accept a case only when either is true.
7. Preserve the controlled executable inventory, network denial, provider tripwires, protected-root checks, reviewer separation, atomic exact-nine publication, and every operational denial.
8. Run Attempt-3 from the assigned reviewer worktree without a short outer timeout. A failed Attempt-3 remains honest evidence and cannot be repaired inside assurance.

## Exact inventories

- T0A owns exactly its six standard task files.
- Attempt-3 M0 owns exactly the existing three T6 M0 paths.
- Attempt-3 M1 owns exactly nine files under `.trellis/tasks/08-12-assure-v1-3-1-complete-system-mal1/research/attempt-3/`.

## Acceptance criteria

- [ ] T0A commits exactly six files.
- [ ] Attempts 1 and 2 remain byte-identical.
- [ ] M0 authenticates S2 `a2a4ea08`, I2 `8fdb45e0`, and corrected T4 `e7ed93f6`.
- [ ] Failed command evidence contains bounded, privacy-safe diagnostics and a stable identifier.
- [ ] Blocked commands identify their prerequisite.
- [ ] Corrected T4 evidence passes through the separate-observation OR rule.
- [ ] Focused self-checks and task validation pass.
- [ ] Attempt-3 emits exactly nine files with honest pass/fail evidence.
- [ ] No provider, network, activation, acceptance, release, publication, push, live-selection, worker-authority, or T7 action occurs.

## Out of scope

Any T1–T5 source repair, Attempts 1–2 rewrite, broad host-PATH restoration, generalized logging framework, T7 decision, activation, publication, release, or push.
