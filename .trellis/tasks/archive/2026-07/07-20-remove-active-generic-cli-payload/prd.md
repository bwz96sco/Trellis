# Remove active generic CLI and package payload

## Goal

Remove active generic product commands and physically remove caller-free generic CLI/template payload from the published package. Keep Trellis as a Research-only Claude Code/Codex control plane while preserving historical cleanup compatibility, user data, Dispatch security, and all 0.7 core compatibility exports.

## Requirements

### Public CLI surface

- Root commands must be exactly:
  - `init`;
  - `update`;
  - `upgrade`;
  - `uninstall`;
  - `research`.
- Remove root `channel`, `mem`, and `workflow` commands.
- `trellis research` groups must be exactly:
  - `init`;
  - `status`;
  - `validate`;
  - `rebuild`;
  - `repo`;
  - `quest`;
  - `campaign`;
  - `run`;
  - `evidence`;
  - `claim`;
  - `dispatch`.
- Remove `research task`, `research task link`, and `research task unlink`.
- Keep all Dispatch children unchanged:
  - `context`;
  - `prepare`;
  - `record-result`;
  - `apply`;
  - `reject`.
- Do not change Dispatch `--owner-skill`, `--provider`, or `--task-ref` parsing or schema behavior in this child.

### Init parser and programmatic boundary

- Remove Commander registration for:
  - `--user`;
  - `--monorepo`;
  - `--no-monorepo`;
  - `--template`;
  - `--registry`;
  - `--overwrite`;
  - `--append`.
- Retain:
  - `--claude`;
  - `--codex`;
  - `--with-statusline`;
  - `--yes`;
  - `--force`;
  - `--skip-existing`.
- Removed commands/options must fail at Commander parsing before command actions or filesystem writes.
- Programmatic `init()` must contain only Research generation. Do not leave generic generation reachable behind internal option fields, constants, or compatibility branches.

### Active generation and template collection

- `createWorkflowStructure()` must produce only Research workflow, config, and gitignore files.
- Claude/Codex generation must use exact Research asset getters, not broad agent/skill directory scans.
- Retain exactly nine `trellis-research-*` stage skills and one Research worker per host.
- Retain current Research hook/config matrix and optional Claude statusline.
- Preserve configure/collect path and byte parity.
- Remove generic scripts, agents, Tasks, workspace, spec packs, commands, skills, onboarding, registry fetching, and workflow marketplace generation code.

### Historical workflow compatibility

- `.trellis/.workflow.json` must continue strict parsing of historical `native` and current `research` selections.
- Remove active native workflow template resolution and marketplace/custom source fetching.
- Recognize released native workflow bytes only through immutable exact digest evidence with documented provenance.
- Preserve classification of:
  - current Research bytes;
  - pristine historical native bytes;
  - pristine managed Research/native bytes by stored hash;
  - modified managed workflow bytes;
  - custom user-owned workflow bytes;
  - missing/unsafe workflow paths;
  - invalid metadata.
- Never infer ownership from headings, directory names, or fuzzy content.

### Cleanup and data safety

- Keep Child A's frozen 137-path current-host cleanup inventory unchanged unless an independently verified defect exists.
- Keep migration manifests and released safe-delete hash evidence unchanged.
- Manifest pruning must continue recognizing historical paths by exact key after active generic collectors disappear.
- Unknown siblings/descendants remain unowned.
- A path leaving active generation does not become deletion authority.
- Modified, malformed, unknown, or user-owned historical files survive.
- Preserve inert Channel logs, Mem/session data, Task metadata, custom workflows, and `.trellis/research/**`.
- Normal uninstall must preserve `.trellis/research/**`.

### Source and package payload

- Delete caller-free generic CLI implementations, utilities, template indexes, and templates from `packages/cli/src`.
- Remove obsolete command/template/script tests only when their production source disappears.
- Clean build output and the packed npm tarball must contain only current Research payload plus required compatibility/migration code.
- Tarball verification must assert both required and forbidden entries. Collector output alone is insufficient package evidence.
- Both `trellis` and `tl` aliases must invoke the same Research-only built parser.

### Compatibility boundary

- Keep these core exports unchanged through 0.7:
  - `@mindfoldhq/trellis-core`;
  - `@mindfoldhq/trellis-core/channel`;
  - `@mindfoldhq/trellis-core/mem`;
  - `@mindfoldhq/trellis-core/research`;
  - `@mindfoldhq/trellis-core/task`;
  - `@mindfoldhq/trellis-core/testing`.
- Do not remove or edit generic core implementation in this child.
- Preserve schema-v1 Research/Dispatch compatibility and C07/C09 fail-closed validation.
- Do not inspect, copy, vendor, import, or depend on private unprefixed Research skill bodies.
- Do not modify `docs-site` or `marketplace`.
- No automatic Git commit.

## Constraints

- Complete `design.md`, `implement.md`, `implement.jsonl`, and `check.jsonl` before activation.
- Run GitNexus upstream impact before editing or deleting any existing function, class, or method.
- Warn and stop before any edited symbol with HIGH or CRITICAL risk.
- Keep inherited dirty changes intact. No reset, clean, stash, broad checkout, force push, merge, rebase, or history rewrite.
- Use exact path/hash evidence for ownership and cleanup.
- Run an independent check after implementation and resolve all confirmed blockers.

## Acceptance Criteria

- [x] Task artifacts validate and Child C is activated only after impact gates pass.
- [x] Root help exposes exactly five supported commands.
- [x] Research help exposes exactly eleven supported groups and no Task group.
- [x] Dispatch help retains `context`, `prepare`, `record-result`, `apply`, and `reject` unchanged.
- [x] Removed commands fail as unknown before command actions or writes.
- [x] Removed init options fail as `commander.unknownOption` before `init()` or writes.
- [x] Retained init flags remain parseable through both `trellis` and `tl`.
- [x] Programmatic init and workflow structure contain no generic generation path.
- [x] Exact Research asset APIs replace broad generic agent/skill discovery.
- [x] Configure/collect paths and bytes remain identical for Claude and Codex.
- [x] Historical native workflow classification uses exact immutable digest evidence without active native template payload.
- [x] Custom, modified, malformed, and unsafe workflow cases preserve existing compatibility behavior.
- [x] Manifest pruning has no generic collector dependency and retains all 137 exact cleanup keys.
- [x] Unknown descendants remain unowned; modified/user content and Research state survive update/uninstall.
- [x] Generic command implementations and caller-free utilities/templates are physically absent from source, clean `dist`, and packed tarball.
- [x] Packed tarball contains every required Research worker, stage skill, hook/config, base template, migration manifest, and cleanup inventory.
- [x] Core export-resolution tests prove all 0.7 public subpaths unchanged.
- [x] C07/C09 Dispatch, schema-v1 compatibility, Research lifecycle, and protected-state tests pass.
- [x] Active generic command specs are removed; retained CLI/safety/package specs carry executable seven-section contracts.
- [x] Focused tests, full CLI/core tests, lint, Python lint, typecheck, clean build, package audit, and `git diff --check` pass.
- [x] `docs-site` and `marketplace` receive no Child C changes.
- [x] Independent `trellis-check` reports no unresolved blocker.
- [x] GitNexus changed-scope review matches expected Child C symbols and separates inherited dirty-tree breadth.
- [x] Child C archives with `--no-commit`; no commit or push occurs.
