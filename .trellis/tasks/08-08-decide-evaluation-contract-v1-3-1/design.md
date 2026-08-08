# v1.3.1 operator decision design

## Boundary

The operator layer consumes immutable author and assurance identities and emits one decision record. It does not reinterpret evidence, repair failures, author semantics, or grant implementation authority.

## Decision model

The input attestation resolves exact commits, tree identities, candidate manifest, semantic target, member aggregate, assurance verdict, and residual-risk summary. The operator chooses one closed decision value and supplies rationale.

## Eligibility

- `accept-with-rationale` requires exact machine verdict `pass`.
- `reject-with-rationale` is permitted for pass or fail evidence.
- `stop` records no acceptance.

No default, timeout, agent output, or prior approval is converted into a decision.

## Output model

O131-1 contains exactly one strict canonical JSON decision record. It binds all inputs and carries explicit false authority flags. It cannot activate runtime or alter live selection.

## Failure behavior

Missing identity, drift, malformed evidence, ambiguous user intent, or non-pass acceptance request produces no decision commit. Retry remains forward-only; never amend an existing decision.

## Terminal boundary

After O131-1, stop the campaign. Any technical correction begins in a new task tree with separate planning and approval.

## Accountable input and output identity

O131-0 writes only the Decision `task.json` activation change and `research/o131-0-decision-input-attestation.json`. O131-1 writes only `research/o131-1-operator-decision.json`. The decision binds exact candidate and assurance commits/digests, operator identity, accountable channel, source-message SHA-256, non-empty rationale, residual-risk acknowledgement, and an RFC3339 UTC timestamp. Ambiguous or multi-valued input produces no decision file.
