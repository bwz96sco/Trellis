# CS6-8 — Record separate operator decision

## Goal

Remain inactive until exact attempt-11 evidence M11 is committed, then record only a genuine separately authorized operator `accept-with-rationale`, `reject-with-rationale`, or `stop` decision without implying activation, archive, release, publication, or push authority.

## Dependencies

- CS6-0 governance is frozen.
- CS6-7 M11 is committed with exact nine-output pass/fail evidence.
- The user/operator supplies an explicit decision in a new instruction.
- Separate task activation and decision-record commit authorization are required.

## Ownership

Owned future output:

- `.trellis/tasks/08-07-cs6-decide-complete-system-attempt-11/research/cs6-8-operator-decision.json`

The task owns its own planning/status metadata only. No other output is allowed.

## Requirements

- Do not infer a decision from silence, prior planning approval, task activation, a machine pass/fail, or another agent message.
- Record exact M11 commit/verdict/output digests and the operator's exact decision/rationale.
- Allowed decisions are `accept-with-rationale`, `reject-with-rationale`, or `stop`.
- Record `humanReviewed=false` unless a real human-review process is separately performed and evidenced; operator decision alone is not human-equivalent technical review.
- Even `accept-with-rationale` keeps live Procedure `1.0.0` and all activation/archive/release/publication/push flags false.
- No repair occurs in this task.

## Exclusions

No production/test/package/registry/spec/accepted-leaf/history/assurance edits, no CS5 honest-stop rewrite, no activation or release record, and no `.trellis/research/**`.

## Activation gate

Committed M11 plus an explicit user/operator instruction to record a named decision.

## Stop gates

- M11 is absent, uncommitted, malformed, or not exact.
- No explicit operator decision is supplied.
- Requested output would imply technical repair, human equivalence, activation, archive, release, publication, or push.
- Any path beyond the one-file allowlist would change.

## Commit boundary

A future O11 commit contains only the one operator decision JSON and task status metadata, and only after separate commit authorization.

## Authority flags

Before an explicit decision, `operatorDecisionReceived=false`. Regardless of decision, `activationAuthorized`, `archiveAuthorized`, `releaseAuthorized`, `publicationAuthorized`, and `pushAuthorized` remain false.

## Acceptance criteria

- [ ] Task remains planning/unassigned until M11 and explicit operator authorization exist.
- [ ] Exactly one allowlisted decision file is written.
- [ ] Decision and rationale match the operator instruction exactly.
- [ ] M11 identities are bound exactly.
- [ ] No technical or operational authority is inferred.
