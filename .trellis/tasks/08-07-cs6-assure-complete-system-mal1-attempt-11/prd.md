# CS6-7 — Run fresh MAL-1 attempt 11

## Goal

Run a fresh mechanically isolated, machine-only complete-system review against exact S11, emit exactly nine portable attempt-11 outputs, and preserve an honest pass/fail without repairs, human-equivalence claims, acceptance, or activation authority.

## Dependencies

- CS6-0 governance is frozen.
- CS6-6 has produced and committed exact S11 under its separate one-file freeze boundary.
- A separate M0 reviewer-assignment boundary names a fresh reviewer runtime that authored no CS6 source, package, fixture, harness, integration, freeze, or oracle bytes.
- Separate task activation and assurance-run authorization are required.

## Ownership

Owned reviewer setup:

- `.trellis/tasks/08-07-cs6-assure-complete-system-mal1-attempt-11/research/reviewer/**`

Exact attempt-11 output directory:

- `.trellis/tasks/08-07-cs6-assure-complete-system-mal1-attempt-11/research/attempt-11/`

The directory contains exactly:

1. `exact-subject-attestation.json`
2. `reviewer-session-attestation.json`
3. `accepted-member-ledger.json`
4. `runtime-contract-audit.json`
5. `harness-case-evidence.jsonl`
6. `command-evidence-ledger.jsonl`
7. `filesystem-mutation-audit.json`
8. `containment-audit.json`
9. `machine-verdict.json`

## Requirements

- Verify exact S11 commit/tree identities before extraction.
- Extract S11 with no working-tree overlay and no repository write outside the allowlisted output path.
- Run the predetermined corpus in an environment that supports archive-safe historical proof and deterministic command isolation.
- Every corpus command must execute; the script must not silently skip the remainder after one failure. Record each exit independently, then compute verdict from the full corpus.
- Recompute accepted member aggregate, semantic digest, package count/identity, 116-case evidence, report canonicalization vector, live `1.0.0`, dormant `2.0.7`, authority flags, historical locks, and filesystem containment.
- Treat any missing command, nonzero required command, output mismatch, mutation, reviewer-independence failure, or environment precondition failure as `fail`.
- Perform no repair and do not reinterpret a failure as subject acceptance.

## Exclusions

No edits to S11, production source, tests, package trees, accepted leaves, registries, specs, CS5 outputs, other child evidence, operator record, or `.trellis/research/**`.

## Activation gate

Exact committed S11, committed M0 reviewer assignment, verified mechanical isolation, and separate user authorization.

## Stop gates

- Reviewer independence or isolation cannot be established.
- Exact S11 identity or extraction digest mismatches.
- A repair would be required.
- Output would exceed the nine-file allowlist.
- The review environment cannot run the complete predetermined corpus honestly.

## Commit boundaries

- Future **M0** contains only reviewer assignment/setup metadata and review machinery under `research/reviewer/**`.
- Future **M11** contains exactly the nine files under `research/attempt-11/` plus task status metadata if separately authorized.
- A pass does not authorize CS6-8, acceptance, activation, archive, release, publication, or push.

## Authority flags

`humanReviewed=false`, `humanEquivalent=false`, `repairAuthority=false`, `completeSystemMachineAssuranceAccepted=false`, `operatorDecisionReceived=false`, and all operational authorization flags remain false.

## Acceptance criteria

- [ ] Reviewer independence and exact S11 are mechanically established.
- [ ] Full corpus runs without skipped commands.
- [ ] Exactly nine outputs exist and are internally digest-consistent.
- [ ] Verdict is exactly `pass` or `fail` and follows mechanical criteria.
- [ ] Repository mutation outside the output allowlist is zero.
- [ ] No repair or authority is granted.
