# Freeze research compatibility contracts

## Goal

Add golden fixtures that lock schema-v1 research behavior and legacy installation ownership before migration code changes.

## Requirements

- Add a complete valid schema-v1 ledger covering Workspace, Repository, Quest, Campaign, Run, Dispatch, Result, Proposal, Decision, Evidence, and Claim.
- Include Dispatch compatibility fixtures with `ownerSkill` and optional `taskRef`.
- Assert strict ledger replay, reduced state, deterministic projection rebuild, and dispatch envelope parsing.
- Add package export-resolution coverage for current root and explicit core subpaths.
- Add a representative 0.6.7 multi-host template-hash manifest and mixed-configuration fixtures for future cleanup tests.
- Do not change runtime production behavior in this child.

## Acceptance Criteria

- [x] Golden ledger parses and reduces successfully.
- [x] Rebuild produces expected deterministic projections.
- [x] `ownerSkill` and `taskRef` survive parsing and reduced state; the core Run projection preserves their Dispatch link through `dispatchId`, and tracked `request.json` preserves the complete Dispatch metadata.
- [x] Sequence gap, malformed JSON, and incompatible schema behavior remain strict.
- [x] Current package exports resolve as documented.
- [x] Legacy manifest fixture covers every currently supported host family and representative shared/mixed paths.
- [x] Existing core and CLI research tests pass unchanged.
- [x] No production source behavior changes.

## Notes

- This child is a prerequisite for every destructive or compatibility-sensitive migration child.
