# Live trial protocol — design only

evaluation_contract_version: evaluation-contract-v1.0.0
status: protocol-only

## Purpose

If later authorized, compare complete frozen source workflow behavior against a matched task control under blinded review. Phase-1 does not compare to migrated Trellis Procedures.

## Rules

- Sanitized/synthetic holdouts only (not source validator fixtures)
- Opaque condition labels; frozen order; no discretionary reruns
- Append-only call ledger
- Blinded independent review
- Raw prompts/outputs/traces only in private evidence directory outside both repos
- Tracked Trellis: summaries, opaque IDs, hashes, aggregates, terminal outcomes only

## Authorization required before any call

provider, exact model, private-source transmission, retention, network, cost ceiling, call budget, retries, storage location, approver, expiry.

## Execution vehicle

Create a new child task for execution. Do not convert F05 into an executor.
