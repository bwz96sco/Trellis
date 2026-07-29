# Design — F06 migration target synthesis

## Target document shape

`frozen-migration-target-v1.json` is the canonical migration contract:

- evaluation_contract_version
- source_commit, trellis_commit
- behaviors[] with disposition + evidence
- package coverage 16/16
- defect and waiver cross-refs
- phase2_requirements summary

SHA-256 of canonical JSON bytes (sorted keys, LF, no trailing spaces) stored in `.sha256`.

## Translation examples (illustrative)

- Source select/block → translate to Proposal + root Decision
- Shared pack root stages 01–07 → preserve methodology; translate storage to Trellis artifact layout (phase-2)
- Host-specific Skill packaging → retire or translate as host adapter, not methodology
