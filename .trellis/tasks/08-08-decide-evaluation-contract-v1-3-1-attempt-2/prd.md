# Decide evaluation-contract v1.3.1 — attempt 2

## Goal

After immutable B132-1 assurance and a new explicit operator instruction, record exactly one accept-with-rationale, reject-with-rationale, or stop decision without implying human review or technical authority.

## Dependencies and ownership

Requires an authenticated committed B132-1 pass or fail and a fresh operator instruction after exact identities are presented. Acceptance requires pass; reject or stop may follow pass or fail. Owned path is `.trellis/tasks/08-08-decide-evaluation-contract-v1-3-1-attempt-2/**` only.

## Boundaries

O132-0 changes task routing metadata and writes one decision-input attestation. O132-1 writes exactly one operator decision JSON. The record binds A11, G131, A131 predecessor, G132, A132, B132, candidate, assurance, mapping/matrix, rationale, accountable source digest, and RFC3339 UTC timestamp.

All human-equivalence, repair, implementation, Procedure, harness, live-selection, activation, archive, release, publication, and push fields remain false. Every outcome terminates at STOP. This planning package authorizes no decision, staging, or commit.
