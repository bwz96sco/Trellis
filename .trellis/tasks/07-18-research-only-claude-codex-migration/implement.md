# Implementation — Research-only Claude and Codex migration

## Task order

- [ ] C01 Freeze research and compatibility fixtures.
- [ ] C02 Protect research data and redesign update/uninstall ownership.
- [ ] C03 Extract retired-host cleanup inventory.
- [ ] C04 Reduce active host registry to Claude Code and Codex.
- [ ] C05 Make Research the sole/default workflow and init layout.
- [ ] C06 Add core stage-capability and optional-skill resolver.
- [ ] C07 Add read-only Dispatch context validation.
- [ ] C08 Add bounded Codex worker and pull preflight.
- [ ] C09 Converge Claude/Codex validation and remove map drift.
- [ ] C10 Retire Channel, Mem, workflow switching, Task links, and generic templates.
- [ ] C11 Prepare bridge-release SDK compatibility.
- [ ] C12 Update root product docs.
- [ ] C13 Publish marketplace migration independently.
- [ ] C14 Publish docs-site migration independently.
- [ ] C15 Run clean-clone release and rollback rehearsal.
- [ ] C16 Remove generic core exports after deprecation window.

## Per-child gates

- [ ] Complete PRD/design/implementation artifacts.
- [ ] Run GitNexus upstream impact before symbol edits; warn on HIGH/CRITICAL.
- [ ] Add focused tests before behavior changes.
- [ ] Run child checks, package lint/typecheck/build, and diff checks.
- [ ] Run GitNexus change detection before commit.
- [ ] Commit only child-owned paths.

## Integration gates

- [ ] Channel remains until C09 parity passes.
- [ ] Active platform registry remains broad until C03 cleanup inventory passes.
- [ ] Research data protection lands before platform/template deletion.
- [ ] Root does not depend on dirty submodule content.
- [ ] 0.7 keeps deprecated generic core exports.
- [ ] 1.0 removal waits for released compatibility window.
