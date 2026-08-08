# v1.3.1 MAL-1 assurance implementation plan

## Preconditions

- A131-1 exists and is immutable.
- B131-0 assigns a fresh reviewer and exact subject.
- Reviewer independence checks pass before semantic execution.
- Candidate output inventory and expected assurance allowlist are frozen.

## Ordered work

1. Extract the exact A131-1 subject into a clean review directory.
2. Recompute candidate and author-evidence identities without trusting sidecars.
3. Verify the semantic-diff ledger and independently scan for unclassified changes.
4. Execute the report-v2 schema audit.
5. Execute all 20 validator semantic audits.
6. Execute all 44 global mutations and 11 inapplicability predicates.
7. Verify the exact ordered 17-tuple mapping domain, exact 11-value immutable lifecycle-family codomain, independently authored/proven per-row choices, and all 845 lifecycle decisions.
8. Run cross-leaf removal/contradiction challenges.
9. Record every mandatory command and continue after failures.
10. Generate exactly the 11 B131-1 outputs and bind them in the verdict.
11. Validate no candidate/protected path changed and no repair occurred.
12. Stop for separate B131-1 commit authorization; never start the decision task automatically.

## Verification

- Strict JSON/duplicate-key parsing for all inputs and outputs.
- Deterministic rerun equality.
- Exact output allowlist and manifest binding.
- Exact pass/fail reduction.
- Task validation and path-scoped diff check.
- Protected identity and dirty-path containment.
- Independent reviewer identity and no shared scratch.

## Retry

A failed B131-1 remains immutable. A retry requires a new assurance attempt task and assignment; never amend or repair the failed evidence.

## Commit boundaries

B131-0 and B131-1 remain separate and individually authorized. No commit or assurance run is authorized by this plan alone.

## Complete-corpus and reproducibility rule

The reviewer executes every frozen author-corpus case and independently constructs additional removal/contradiction checks. It continues after individual failures, runs the complete corpus twice in separate clean directories, and compares bytes, exits, ordering, findings, write observations, and verdict. A crash, omitted case, mutable fixture, failed precondition, non-determinism, or unexplained output reduces to `fail`. Exactly the 11 allowlisted B131-1 files may be written.
