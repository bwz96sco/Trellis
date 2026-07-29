# Design — F05 live trial preparation

## Authorization template fields

provider, model_id, allow_private_source_transmission, retention_policy, network_allowed, cost_ceiling, call_budget, retries, storage_location, approver, expires_at.

## Blinding

Reviewers see condition codes (A/B/C), not package names or system prompts. Blind key held outside Trellis.

## Not-run path

If no authorization by F06 start: commit `live-trial-not-run-decision.md` with rationale; F06 proceeds on deterministic evidence only.
