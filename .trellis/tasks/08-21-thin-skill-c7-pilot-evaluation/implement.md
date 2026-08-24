# C7 Evaluation Plan

## Sequence

1. Validate and activate C7 after C6 commit/archive.
2. Freeze exact C1 source identity and C6 package identities.
3. Create append-only evaluation schema, case files, independent workspaces, and output inventory.
4. Record deterministic lifecycle/package/authority proof without invoking a provider.
5. Present exact provider run boundary and obtain separate authorization.
6. Execute matched A/B/C arms without cross-arm contamination.
7. Append every run record; preserve failures and partial outputs.
8. Evaluate case-specific assertions after arms complete.
9. Stop immediately on zero-tolerance failure; do not expand migration.
10. Otherwise summarize repeated differences and record one final disposition.
11. Commit/archive C7 evidence and journal through normal hooks; no push/publication/release.
12. Stop. Do not create or start a next migration task automatically.

## Planned Minimum Cases

- `literature-01`: bounded one-paper review.
- `literature-02`: question-scoped register update/reuse.
- `literature-03`: managed interruption/recovery.
- `ideation-01`: normal one-portfolio generation and stop.
- `ideation-02`: Quest-governed H1/H2 transition boundary.
- `evaluation-01`: independent candidate attacks plus selected-or-blocked closure.
- `quest-admin-01`: import preview/write exactness.
- `quest-admin-02`: source writer refusal with byte-identical filesystem.
- `quest-admin-03`: export, validation, and explicit authority recovery.

All applicable arms run. Any unavailable arm is recorded with reason; total real invocations must remain at least ten.

## Verification

- JSON/JSONL schema and digest validation via `uv` Python scripts;
- duplicate/missing run and cross-arm path isolation checks;
- exact C1/C6 identity checks;
- deterministic lifecycle/authority proof;
- zero-tolerance assertion completeness;
- `git diff --check` and task validation;
- no provider process before authorization;
- no canonical product schema edits unless a C7-discovered product defect is separately scoped.

## Rollback

Evaluation evidence is append-only and honest. Failed runs remain. Product rollback follows the layer that failed; C7 never deletes canonical C1–C6 state or source evidence.
