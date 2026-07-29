# F01 Freeze research workflow evaluation contract

## Goal

Freeze evaluation governance and baselines **before any evidence scoring**: source 16-package registry + commit, Trellis comparison commit + Procedure inventory, file hashes, evaluator/harness versions, allowed evidence, reviewer roles, rubric thresholds, failure taxonomy, evidence ID scheme, and privacy policy.

## Predecessor gate

- Parent `07-28-evaluate-research-workflow-fidelity` planning artifacts complete and reviewed.
- Explicit user activation/execution authorization for F01 (planning-only authorization is insufficient to pin baselines and write research/ freeze files).
- Source path `/Users/zhangbowen/Projects/agent-skills-private` available as **read-only**.

## Requirements

1. Produce under this child's `research/` directory:
   - `evaluation-charter.md`
   - `source-baseline.json`
   - `source-file-manifest.json`
   - `evidence-privacy-policy.md`
   - `evaluation-rubric.yaml`
   - `failure-taxonomy.yaml`
   - `reviewer-and-blinding-protocol.md`
   - `evidence-reference-schema.json`
2. Freeze exact 16-package registry list and source commit SHA.
3. Freeze Trellis comparison commit SHA and current Procedure inventory (ids/versions/paths/digests or instruction hashes).
4. Record file hashes for every source path in the evaluation manifest (path + sha256 only; no body content).
5. Define opaque evidence ID prefixes: SRC-*, VAL-*, FIX-*, RUN-*, REV-* with allocation rules.
6. Versioning: launched evaluation-contract artifacts are **immutable**; corrections create a new evaluation-contract version.
7. Rubric weights match parent PRD (15/15/15/15/20/10/10) with 0–4 scale and hard gates that override scores.
8. Failure taxonomy separates source defects, validator defects, and evaluation-infrastructure outcomes (provider outage, budget, reviewer disagreement must not be labeled source defects).
9. Privacy policy forbids private Skill bodies, validator source, tests, prompts, raw cases, raw model output in tracked Trellis.
10. Stop if: source repo dirty, registered family cannot be reproduced from pinned commit, or private-evidence handling unresolved.

## Acceptance Criteria

- [ ] All eight freeze artifacts exist under `research/` with schema-valid IDs and hashes.
- [ ] Registry count is exactly 16 and lists the registered research-* packages only.
- [ ] Source commit clean and reproducible from pin.
- [ ] Trellis Procedure inventory includes at least idea-generation-v1 and idea-evaluation-v1 with path references.
- [ ] Rubric, taxonomy, privacy, blinding, evidence schema frozen with version string.
- [ ] No source or Trellis production file modified.
- [ ] No private bodies stored—only paths/hashes/abstract metadata.

## Out of Scope

- Scoring any workflow behavior.
- Running validators or live models.
- F02–F07 execution outputs.
- Production Procedure edits.

## Notes

Registered research packages (planning-time list; re-verify at F01 execution from registry): research-review-case, research-review-campaign, research-literature, research-ideation, research-idea-evaluation, research-project-setup, research-experiment, research-experiment-campaign, research-computation, research-figure, research-slides, research-survey, research-writing, research-theory, research-quest, research-quest-admin.
