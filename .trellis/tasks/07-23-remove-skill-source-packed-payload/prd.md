# C09 Remove Skill source and packed payload

## Goal

Remove dormant Research stage Skill source templates and invert packed CLI inventory so tarballs require retirement evidence/Procedures/workers and forbid stage Skill bundles.

## Predecessor gate

- C08 complete: generation stopped; retirement evidence exists; cleanup works without active Skill generation.
- C10 remains blocked until C09 acceptance.

## Requirements

1. Delete exactly the nine `packages/cli/src/templates/common/bundled-skills/trellis-research-*` roots.
2. Remove caller-free stage Skill loader/constants from `templates/common` (keep only a stable empty module marker if needed).
3. Packed CLI inventory must require retirement evidence, Procedures, workers, hooks, migrations; forbid `bundled-skills/trellis-research-*`.
4. Preserve workers, hooks, Procedures, retirement evidence, generic cleanup inventories, versions, and dependency pins.
5. Update executable specs to final-state C09 wording (no temporary “dormant source retained” language).

## Acceptance Criteria

- [x] No stage Skill source roots remain under `templates/common/bundled-skills/`.
- [x] Fresh generation remains Skill-free (C08).
- [x] Packed inventory requires retirement evidence and forbids stage Skill paths.
- [x] Focused tests cover source absence and packed negative inventory.
- [x] Full CLI test/lint/typecheck gates pass (911 tests).
- [x] No commit of unrelated dirty paths (pending optional C09 commit).

## Non-Goals

- No C10 install smoke / parent closeout.
- No invented deletion hashes for installed Skills.
- No docs-site/marketplace/AGENTS.md/CLAUDE.md edits.
