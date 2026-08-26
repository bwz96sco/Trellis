# C10 implementation plan

1. Materialize C10 static inputs from committed C9 Git objects at `cacbd39c`; create predecessor authentication, fresh ledger, and empty outputs.
2. Update successor-owned evaluation/proof identities to C10 while preserving source identity `c8-source-baseline` and immutable package/source digests.
3. Add direct executable resolution and route evidence. Verify direct CLI version and first-party OAuth without model invocation.
4. Expand child environment isolation with exact parent-session/advisor/suggestion/effort controls; add explicit `--effort low`.
5. Update runner, harness, auth/predecessor verifiers, schemas, and tests. Run task-local tests, predecessor/source/auth verification, and static validation.
6. Generate C10 deterministic proof. Confirm zero reservations and zero provider/model launches.
7. Run `literature-01/A` as both first formal slot and exact-model probe. Stop immediately if `modelUsage` is not exactly `claude-sonnet-5`.
8. If probe passes, execute the remaining seventeen planned A/B/C slots sequentially. Retry only exact no-output infrastructure failures, at most six, within twenty-four total reservations.
9. Open each evaluator barrier only after all three sibling arms are usable; append six root case evaluations and generate summary/decision.
10. Require `fullMigrationClaimAllowed: true`. Otherwise commit forward blocked evidence and stop.
11. After pass, generate the ten remaining schema-v3 packages from frozen source bytes. Preserve existing package-version directories and native `research-quest` replacement.
12. Generalize packed inventory to sixteen versions, thirty members, and sixty-two required assets. Run required GitNexus impact before editing the CRITICAL inventory symbol.
13. Run focused/full tests, builds, real tar audit, installed-package audits, `git diff --check`, and GitNexus compare/staged change detection.
14. Commit with normal hooks while temporarily hiding and then restoring the eight unrelated dirty files. Archive only after successful migration. Never push, release, publish, or open a PR.
