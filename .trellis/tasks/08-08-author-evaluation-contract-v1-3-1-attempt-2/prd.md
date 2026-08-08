# Author evaluation-contract v1.3.1 — attempt 2

## Goal

After separate A132-0 authorization, author a deterministic seven-member candidate for the exact identity `evaluation-contract-v1.3.1` using G132's fixed disposition-aware mapping. Attempt-2 does not rename the contract and does not amend A131.

## Dependencies and ownership

Requires committed G132 and a separately committed A132-0 author assignment. Owned path is `.trellis/tasks/08-08-author-evaluation-contract-v1-3-1-attempt-2/**`. Accepted v1.3.0, A11, G131/A131, Procedure packages, production, tests, registries, specifications, assurance, decision, and parent research paths are read-only or excluded.

## Requirements

- Preserve findings `CS6-1-CONTRACT-001` through `003` and every G131 continuity rule unchanged.
- Correct finding `004` with exactly the 17 G132 rows. The author has no per-row family discretion.
- Encode the exact five-field closed row schema and conditional nullability; null is not a family.
- Use exactly `mappingRow.disposition == "applicable" AND binding.targetArtifactFamily == mappingRow.artifactFamily`.
- Materialize and prove all 14,365 decisions: 975 positive and 13,390 negative; every not-applicable row has zero positives.
- Preserve `experiment-campaign-v1` lifecycle family `research-experiment-campaign` independently from closure family `research-experiment`.
- Preserve seven leaves, all frozen populations, exact G131 propagation tables/digest framing/71 `DEC-*` guards/no direct-region `EV-*` or `SRC-*` additions, and the no-fifth-change rule.
- Emit exactly the A132-1 15-file inventory; no sidecar or external fixture is allowed.

## Boundaries

A132-0 changes only task routing metadata plus one assignment/input-authorization record. A132-1 writes only the exact 15 outputs. This planning package authorizes neither boundary, staging, nor commit.
