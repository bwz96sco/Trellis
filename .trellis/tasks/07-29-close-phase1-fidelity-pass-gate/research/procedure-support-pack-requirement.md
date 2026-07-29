# Procedure support material requirement (Phase-1 → Phase-2)

evaluation_contract_version: evaluation-contract-v1.1.0

## Supersedes premature two-file assumption

Phase 1 does **not** conclude that two-file Procedures (`procedure.json` + `PROCEDURE.md`) alone are sufficient for methodology fidelity.

Source methodology includes templates, validators, artifact schemas, rubrics, and reference contracts.

## Phase-2 requirement (authoritative for handoff)

Phase 2 must determine whether methodology support material is:

1. carried only in authoritative Procedure instruction files, **or**
2. stored in a **digest-bound Procedure support pack**, **or**
3. implemented as **versioned trusted runtime contracts**.

**No sibling file may affect execution unless it is enumerated and digest-bound.**

This keeps the control plane fail-closed without pre-deciding that two-file packaging is adequate.
