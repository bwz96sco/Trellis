# Add Research stage capability resolver

## Goal

Add a pure core-owned exhaustive mapping from Quest stage to logical Research capability, optional discovered skill name, and bundled fallback, with exact Claude/Codex host validation and explicit terminal-stage rejection.

## Requirements

- Define all ten `QuestStage` values in one exported core descriptor table.
- Exactly nine stages are dispatchable; `complete` is explicit and non-dispatchable.
- Logical capabilities are stable names: `research.setup`, `research.framing`, `research.literature`, `research.ideation`, `research.experiment`, `research.computation`, `research.theory`, `research.audit`, and `research.writing`.
- Map each active stage to one optional external skill name and one bundled `trellis-research-*` fallback.
- Preserve asymmetric audit mapping: optional `research-review-case`, fallback `trellis-research-audit`.
- Accept execution hosts exactly as `claude` or `codex`; reject blank, case variants, installer IDs, retired hosts, and arbitrary values.
- Resolver input contains stage, host, and caller-supplied discovered skill names only.
- Normalize discovered names by trimming, dropping empty values, and exact deduplication.
- Matching is case-sensitive and exact; do not interpret `/`, `$`, paths, plugin namespaces, aliases, or skill bodies.
- Prefer exact optional external skill when present; otherwise select bundled fallback.
- Discovery order and duplicate entries must not affect result.
- Supplying any skill name must not make `complete` dispatchable.
- Resolver must be pure: no filesystem, process, host invocation, state reads, ledger access, or mutation.
- Quest stage is capability authority. Historical `Dispatch.ownerSkill` and `taskRef` remain readable compatibility metadata and are not rewritten or made authoritative.
- Do not add capability/resolution fields to Dispatch schema, events, projections, or tracked request files.
- Export new API only through existing `@mindfoldhq/trellis-core/research` subpath.
- Do not change package root exports or package export keys.
- Do not modify CLI Research commands, Claude hooks, Codex worker/preflight, Dispatch preparation flags, or duplicate hook maps in this child.
- Do not touch `docs-site`, `marketplace`, unrelated dirty files, or create a commit.

## Acceptance Criteria

- [x] Exported descriptor contains exactly all ten Quest stages and compiles exhaustively.
- [x] Exactly nine active stages expose exact capability/optional/fallback triples.
- [x] `complete` returns explicit non-dispatchable null capability/skill fields even when matching-looking skills are supplied.
- [x] Host parser accepts only `claude` and `codex` with deterministic validation errors otherwise.
- [x] Name normalization is trim/drop-empty/exact-dedupe and does not mutate input.
- [x] Exact optional name selects source `host`; absent, case-varied, adorned, or unrelated names select source `bundled`.
- [x] Resolution is deterministic across discovery order and duplicates.
- [x] Existing arbitrary schema-v1 `ownerSkill`, `provider`, and `taskRef` fixtures remain byte-stable and readable.
- [x] No Dispatch/event/reducer/projection/store behavior changes.
- [x] Built `@mindfoldhq/trellis-core/research` exports new API; root barrel and export-key list remain unchanged.
- [x] Core focused/full tests, CLI compatibility tests, lint, typecheck, build, workspace typecheck, and `git diff --check` pass.
- [x] GitNexus change detection reports only additive core resolver, export, test, and spec scope.
- [x] No C07-C09 orchestration/hook/worker behavior or unrelated files are changed.
