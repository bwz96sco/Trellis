# Decide evaluation-contract v1.3.1

## Goal

After immutable machine assurance, record exactly one genuine operator decision—accept, reject, or stop—without implying human review or any technical/operational authority.

## Dependencies

- Committed B131-1 assurance evidence.
- Assurance verdict exactly `pass` for acceptance eligibility.
- Separate explicit operator instruction after the exact assurance identities are presented.

A machine `fail` may be rejected or stopped but cannot be converted to pass. Silence, cowork messages, agent recommendations, or earlier planning approval are not operator decisions.

## Ownership

Owned path: `.trellis/tasks/08-08-decide-evaluation-contract-v1-3-1/**`.

The task owns activation metadata and one operator decision record only. It owns no candidate, assurance, production, test, package, registry, specification, archive, release, publication, or push path.

## Allowed decisions

- `accept-with-rationale`;
- `reject-with-rationale`;
- `stop`.

The record must bind:

- exact A11 commit and four finding IDs;
- exact G131, A131-0, A131-1, B131-0, and B131-1 commits;
- exact candidate manifest and semantic target digests;
- exact seven-member aggregate;
- assurance level and verdict;
- residual risks and operator rationale;
- decision timestamp and accountable operator channel.

## Authority containment

Every decision record states:

- `humanReviewed:false`;
- `humanEquivalent:false`;
- `runtimeImplementationAuthorized:false`;
- `cliImplementationAuthorized:false`;
- `procedurePackageAuthorized:false`;
- `harnessImplementationAuthorized:false`;
- `liveSelectionChangeAuthorized:false`;
- `activationAuthorized:false`;
- `archiveAuthorized:false`;
- `releaseAuthorized:false`;
- `publicationAuthorized:false`;
- `pushAuthorized:false`.

Acceptance establishes only semantic-contract authority for a future separately governed technical campaign.

## Activation and stop gates

Do not activate before an authenticated committed B131-1 `pass` or `fail` and a fresh genuine operator instruction. Stop on missing/mismatched identities, non-pass acceptance request, ambiguous decision, inferred approval, or any requested technical/operational authority. A `pass` permits accept/reject/stop; a `fail` permits reject/stop only.

## Commit boundaries

- **O131-0**: task activation and exact decision-input attestation only.
- **O131-1**: one operator decision JSON only.

No activation, decision, or commit is authorized by the current planning instruction.

## Acceptance criteria

- [ ] Decision input identities are exact and immutable.
- [ ] The decision is one of the three allowed values with rationale.
- [ ] Acceptance is impossible unless assurance verdict is exactly pass.
- [ ] The operator record contains all false human-equivalence and operational-authority flags.
- [ ] No candidate, assurance, production, package, or historical byte changes.
- [ ] The campaign stops after O131-1.
