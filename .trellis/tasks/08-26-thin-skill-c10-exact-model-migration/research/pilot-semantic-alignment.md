# Research: Pilot semantic alignment

- **Query**: Compare exact source Git-object bytes at `86df5a676c52950592ff9fe5966b9c1753160cb5` with bundled `research-literature@1.0.0` and `research-ideation@1.0.0`; ignore host syntax and duties already represented by Trellis manifests/commands; decide immutable version disposition.
- **Scope**: Internal
- **Date**: 2026-08-25
- **Source policy**: Source instructions read only through `git rev-parse`, `git ls-tree`, `git cat-file`, and `git diff-tree` in `/Users/zhangbowen/Projects/agent-skills-private`. No source working-tree file read.

## Decision

| Package | Decision | Material reason |
|---|---|---|
| `research-literature` | `require-1.1.0` | `1.0.0` omits source register row/status/relevance contract and changes derivative-analysis ownership from `research-opportunity-mining` to `research-ideation`. |
| `research-ideation` | `require-1.1.0` | `1.0.0` omits source opportunity-evidence precedence/no-rerun rule and candidate rejection for hidden compute, leakage, unfair baselines, cosmetic renaming, or unevaluable mechanisms. |

Existing `1.0.0` bytes remain immutable. Alignment requires new `1.1.0` versions.

## Exact source objects

Source commit resolves to tree `aa0282da9c63f8f17dd94b672b3fd6843647a0bd`, parent `e2b0d70e3a797f19461eb106601de12250000b69`.

| Source path | Mode | Blob OID | Bytes | SHA-256 |
|---|---:|---|---:|---|
| `skills/research-literature/SKILL.md` | `100644` | `706cc7397f71e85a16ae94a413120fd0b0fe1f0e` | 3431 | `07d1aa5fb2d437cb21cbe8eae708f15163453a257dec22210b0c37661756c98b` |
| `skills/research-ideation/SKILL.md` | `100644` | `7ce5ad4174f696b7e0e401f63b84b235dad1a2d5` | 4217 | `979d75ebd39b08fefe81c326b24a36b2d815bbde3ac9610ef41b99932c1a97a2` |

`git diff-tree` shows `86df5a6` changes only `skills/research-quest-admin/scripts/research_quest_admin.py`. Both compared instruction blobs equal parent blobs. Decisions compare exact commit bytes against package semantics; they do not claim `86df5a6` introduced these instruction texts.

## Bundled package file digests

All six files are tracked, clean, mode `100644`, and worktree Git blob IDs match index blob IDs.

### `research-literature@1.0.0`

| File | Git blob | Bytes | SHA-256 |
|---|---|---:|---|
| `packages/cli/src/templates/research/skills/research-literature/1.0.0/skill.json` | `abb4b148313a063bd29a50d8f801b11d3c3e9001` | 587 | `b668c1f2bd31aa3f0dd58d555f8ca404f0a0f4bfb13ec8d502a60253465d3946` |
| `packages/cli/src/templates/research/skills/research-literature/1.0.0/SKILL.md` | `b96b4a2ab513c9197a1d582da54d6b6c1a84d427` | 1924 | `c09c50d047951220fe74c271263a65e10e6e26ca2d75b9c62ee7bff53a5ff308` |
| `packages/cli/src/templates/research/skills/research-literature/1.0.0/templates/note-template.md` | `362e80e21fdbf23d604f899adb29f4055500d40b` | 2499 | `3e01c5ec149958590ef3d3ab6751fb1db3203b978b5a698c22e7eef33894ed71` |

### `research-ideation@1.0.0`

| File | Git blob | Bytes | SHA-256 |
|---|---|---:|---|
| `packages/cli/src/templates/research/skills/research-ideation/1.0.0/skill.json` | `56d5ad2ae695f730430ab39b734525b700eb42fd` | 605 | `d7aac0d68ec65543b78d47d21c49a8217c6640d05560798c358b85dcad83f1d0` |
| `packages/cli/src/templates/research/skills/research-ideation/1.0.0/SKILL.md` | `3781da84f853dc1e884eefb5c252bfe1a6dd0930` | 1901 | `7664eb0058cf97ff5eeed32b3aac0fd5318f66a5a1504741d3c12180bd9924c4` |
| `packages/cli/src/templates/research/skills/research-ideation/1.0.0/templates/opportunity-board-template.md` | `e81e2dd951bb98e01ec5ba552f51dad8a886897b` | 1661 | `4bdb5a549fe58b02cad078f76cc9f04f1e32dc9533211d7a85e36f28c883582b` |

## Obligation mapping

### Literature

| Source obligation | Package representation | Classification |
|---|---|---|
| Explicit target question; stop if absent (`source` L8-L16) | Package `SKILL.md` L3, L7 | Preserved |
| Verify identity/metadata; reuse completed note (L17) | Package L8 | Preserved; tool names abstracted |
| Register columns, four status values, question-specific relevance (L18) | Package only names register/update; no manifest, command, or member defines row contract | **Material omission** |
| Skeleton-first reading, anchored evidence, category separation, abstract-only handling (L19, L26-L32) | Package L9-L12 plus byte-authenticated note template L3-L65 | Preserved |
| One clean context per paper (L19) | Lightweight root unit or separately approved one-paper managed invocation; manifest binds `research.literature.review` | Preserved host adaptation |
| Save note, update status and relevance; completion invariants (L20-L22) | Declared output boundary exists, but status/relevance merge is not required | **Material partial omission** |
| Defect analysis stops before derivative method work; next owner is `research-opportunity-mining` (L28) | Package L21 and manifest point to `research-ideation` | **Material ownership change** |
| Quest event/admin/state boundary (L33) | Root-owned gate/Workflow/Quest commands; worker mutation forbidden | Represented by Trellis commands |

Legacy heading acceptance (L29) is omitted but classified non-material compatibility detail. Source tool names, workspace paths, PDF archive, and explicit `$...` syntax are host details.

### Ideation

| Source obligation | Package representation | Classification |
|---|---|---|
| Freeze question, constraints, non-goals, scope (L16) | Package L7 | Preserved |
| Prefer opportunity-mining outputs; consume `O#` seeds without rerunning six lenses; fallback to register/notes/synthesis (L17) | Package L8 only says consume supplied literature/opportunity context | **Material partial omission** |
| Map symptom, mechanism, unresolved cause, actionability evidence (L18) | Package L9 | Preserved |
| One 3-7 candidate portfolio with stable IDs, mechanism, prior/delta, resources, cheapest test, kill condition (L8, L19) | Package L3, L10 | Preserved |
| Mechanism diversity and conservative/upside/simple routes (L19) | Package L11 | Preserved; package adds compatible split guidance |
| Stop before evaluation/selection/experiment/continuation (L20-L22) | Package L14-L18; manifest `autoInvoke: false` | Preserved |
| H1/H2 human gates and validation (L24-L32) | Opportunity-board template plus canonical Trellis gate/Workflow commands | Represented by Trellis template/commands |
| Unknown novelty and seed-not-approval rules (L36-L37) | Package L8, L16 | Preserved |
| Reject hidden-compute, leakage, unfair-baseline, cosmetic, or unevaluable routes (L38) | No package or command equivalent | **Material omission** |
| Similarity/scores/order are not evidence (L39) | Package forbids evaluation and selection | Preserved by generation-only boundary |

## Related specs

- `.trellis/tasks/08-25-thin-skill-c8-full-migration/prd.md:33-36` — immutable version rule.
- `.trellis/tasks/08-25-thin-skill-c8-full-migration/design.md:73-80` — semantic-alignment decision rule.
- `.trellis/spec/cli/backend/commands-research.md:791-831,945-953,983-990` — gate, Workflow, handoff, and authority replacements.
- `.trellis/spec/core/backend/research-state.md:1406-1412` — canonical H1/H2 universe and gate authority.

## Caveats / Not Found

- No external references needed; comparison is repository-internal.
- Machine-readable file contains complete per-obligation mapping and exact digest records.
