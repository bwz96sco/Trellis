# CS6-8 implementation plan

## Preconditions

- Exact M11 is committed.
- The operator explicitly supplies one allowed decision and rationale.
- Separate task activation and O11 commit authorization exist.

## Ordered work

1. Verify exact M11 commit, verdict, and nine output digests.
2. Capture the operator's exact allowed decision and rationale without paraphrased authority expansion.
3. Write the single allowlisted JSON record with explicit false operational flags.
4. Validate schema, exact evidence bindings, path allowlist, and protected no-drift.
5. Stop without activation, archive, release, publication, or push.

## Verification

- exact one-file output allowlist
- exact M11 identities and decision enum
- task validation and path-scoped diff hygiene
- protected/historical no-drift checks

## Stop/rollback

Silence or ambiguity means stop without writing. Remove only an uncommitted decision file if validation fails.

## Commit boundary

Future O11 contains only the one decision JSON and task metadata. No commit is currently authorized.
