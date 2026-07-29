# F05 Prepare optional live research workflow trials

## Goal

Design the live trial protocol and authorization templates **without executing model calls**. If later authorized, a **separate execution child** runs trials; F05 is not modified into an executor.

## Predecessor gate

- F01 privacy/governance freeze complete (required for parallel start).
- Explicit F05 activation for protocol writing.
- Live calls require **new** authorization document covering: provider, exact model, private-source transmission, retention, network, cost, call budget, retries, storage.

## Deliverables (`research/`)

- `live-trial-protocol.md`
- `live-trial-authorization-template.json`
- `live-case-manifest-template.json`
- `call-ledger-schema.json`
- `blind-review-packet-schema.json`
- `live-trial-not-run-decision.md` when authorization is absent

## Protocol rules

- Sanitized or synthetic holdouts; not source validator fixtures.
- Opaque condition labels; frozen order; no discretionary reruns.
- Append-only call evidence.
- Blinded independent review.
- Compare complete frozen **source** workflow against matched task control.
- Do **not** compare to migrated Procedures in phase 1.
- Raw prompts, private source, outputs, blind keys, detailed traces stay outside both repositories in operator-approved private evidence directory.
- Tracked artifacts: approved summaries, opaque IDs, hashes, aggregate scores, terminal outcomes only.

## Out of Scope

- Any live model or network call in F05
- Procedure migration
