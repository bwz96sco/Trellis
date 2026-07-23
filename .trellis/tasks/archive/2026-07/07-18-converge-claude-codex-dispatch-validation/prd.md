# Converge Claude and Codex Dispatch validation

## Goal

Make core C07 provider-neutral preflight the sole Dispatch decision authority for Claude Code and Codex. Remove Claude stage-map/schema/state drift. Prove both hosts receive identical bounded decisions before generic Channel removal.

## Requirements

### Authority

- Claude explicit Dispatch must use `trellis research dispatch context` rather than duplicate request, ledger, projection, hierarchy, Repository, artifact, path, stage, owner, Task, or output validation.
- C07 and core stage capability resolver remain canonical.
- Existing schema-v1 Dispatch records remain readable without ledger rewrite.
- `ownerSkill`, `provider`, and `taskRef` remain warning-only compatibility metadata.
- `expectedOutputs` remain bounded descriptive text.
- No Python fallback validator may silently take authority when C07 is unavailable.

### Trigger and process boundary

- Claude validation triggers only for `trellis-research-worker` Agent invocation with complete exact one-line Dispatch envelope.
- Ordinary Claude prompts, other agents, and already-injected prompts execute no C07 subprocess.
- Exact pointer must be canonical lowercase `.trellis/research/dispatches/dsp_<uuid>/request.json`.
- Reject extra lines or blank lines, tails, prefixes, suffixes, traversal, aliases, backslashes, absolute paths, and case variations.
- Child-repository invocation must discover root Research control plane without moving authority into child repository.

### Optional skill selection

- First Claude C07 pass supplies no skill names.
- Only after successful pass 1 may hook inspect validated `capability.optionalSkill`.
- Hook may inspect file metadata only for exact direct project and personal Claude skill paths.
- Hook must not enumerate skill directories, read skill body/frontmatter, inspect target Repository, or infer plugin/nested/add-dir/enterprise inventory.
- Exact direct skill presence triggers one final C07 pass with exactly one canonical `--skill-name`.
- Final C07 response owns selected skill.
- Worker invokes exactly `capability.selectedSkill` through Claude `Skill` tool.
- Missing/disabled/unreadable selected skill returns blocked Result plus empty pending Proposal; no silent fallback after validated selection.

### Failure behavior

- Typed C07 failure must stop before target access and deny Claude Agent launch.
- Missing/stale CLI, malformed/empty/multiple JSON, successful stderr, or response-contract mismatch must deny with bounded `PREFLIGHT_EXECUTION_FAILED`.
- Denial reason must not expose target data or unbounded process output.
- No target Repository read/write, check execution, skill-body access, Research mutation, or worker startup may occur after failed preflight.

### Worker authority

- Claude worker reads only inline context text and declared artifact resolved paths.
- Claude worker writes only exact allowed resolved paths with pre-write containment recheck.
- Worker never uses legacy owner/provider/task metadata as authority.
- Worker never accesses network/web/MCP/undeclared sources, spawns nested agents, mutates canonical Research state, reviews Proposal, mutates Git history, or broadens sandbox.
- Worker returns one strict raw Result plus pending Proposal JSON.

### Parity and drift prevention

- Shared canonical fixtures must be created through production Research operations, not handwritten projection-only state.
- Direct C07 results for Claude and Codex must agree on validity and every provider-neutral authority field.
- Claude injected JSON must equal direct Claude C07 result.
- Codex template must retain first-process C07 contract and same response validation.
- All nine active stages, `complete`, compatibility warnings, canonical-state errors, Repository/artifact/path errors, process failures, and zero-write guarantees must be covered.
- Remaining presentation-only stage/name lists must have invariant tests derived from core definitions.

## Constraints

- Only Claude Code and Codex are current hosts.
- Do not copy, vendor, import, inspect, or depend on private optional skill bodies.
- Do not modify `docs-site` or `marketplace`.
- Do not mutate canonical `.trellis/research/**` from worker flow.
- Do not add C07 subprocesses to normal Claude prompts.
- Do not remove Channel until this task passes.
- Do not change C07/core source unless parity exposes a confirmed shared defect.
- No automatic Git commit.

## Acceptance Criteria

- [x] Claude Dispatch hook contains no Dispatch stage map and no duplicate provider-neutral validator.
- [x] Exact one-line Claude envelope is enforced; ordinary prompts run no preflight process.
- [x] Claude invokes C07 once without optional skill, or twice only when exact direct optional skill metadata exists.
- [x] Final C07 JSON is validated then injected without undeclared parent prompt tail.
- [x] Invalid envelope/preflight denies Agent launch with bounded reason.
- [x] Claude worker dynamically invokes only validated selected skill and enforces bounded read/write/output authority.
- [x] Shared production-built fixtures prove provider-neutral Claude/Codex parity for required matrix.
- [x] Compatibility metadata is warning-only and `expectedOutputs` remain text.
- [x] Success and failure paths are full-tree zero-write before worker execution.
- [x] Remaining stage/skill presentation lists are invariant-tested against core definitions.
- [x] Research hook and command code-specs contain all seven executable-contract sections.
- [x] Focused tests, CLI full tests, lint, Python lint, typecheck, build, and `git diff --check` pass.
- [x] Independent `trellis-check` reports no unresolved blocker.
- [x] Task archives with `--no-commit`; C10 remains blocked until archive gate passes.
