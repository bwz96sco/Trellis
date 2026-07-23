# Research-only Claude and Codex migration

## Goal

Migrate this fork into a research-only Trellis distribution supporting Claude Code and Codex as current hosts, while preserving canonical research data and safely retiring generated assets from previously supported hosts.

## Requirements

- Preserve schema-v1 research ledger, events, reducers, projections, rebuild behavior, and root review authority.
- Preserve existing Dispatch `ownerSkill` and `taskRef` fields as readable compatibility metadata.
- Support only Claude Code and Codex in current init, configuration, templates, tests, help, and current docs.
- Keep a separate legacy cleanup inventory for retired hosts; do not expose it as active support.
- Make Research the sole workflow for fresh installs.
- Add deterministic bounded Codex execution before removing Channel.
- Remove active Channel, Mem, workflow switching, Research Task links, generic coding workflow assets, and unrelated platform templates only after replacement and migration gates pass.
- Default uninstall must preserve `.trellis/research/**`.
- Keep generic core subpaths working but deprecated through the 0.7 compatibility line; remove them only in a later semver-major release.
- Treat root, `marketplace`, and `docs-site` as independent Git histories and publish each independently.
- Preserve unrelated dirty files and submodule-local work throughout implementation.

## Acceptance Criteria

- [ ] Parent and 16 child tasks exist with explicit ordering and independently testable scopes.
- [ ] Fresh install exposes only Claude Code and Codex and installs Research as the sole workflow.
- [ ] Existing research ledgers replay and rebuild without data loss or schema migration.
- [ ] Default update/uninstall never deletes canonical research data.
- [ ] Retired generated files are removed only when ownership is proven; modified and mixed user files are preserved.
- [ ] Claude and Codex produce identical Dispatch validation and bounded context decisions.
- [ ] `trellis --help` exposes only init, update, upgrade, uninstall, and research surfaces.
- [ ] Root package, marketplace, and docs-site are reproducible from a clean recursive clone.
- [ ] 0.7 retains deprecated generic core exports; major release removes them after the compatibility window.
- [ ] Full tests, lint, Python analysis, typecheck, build, package, upgrade, uninstall, clean-clone, Claude, and Codex checks pass.

## Notes

- Parent owns requirements, dependency map, release gates, and final integration review. Children own implementation.
- Do not remove Channel until bounded Codex parity is verified.
- Do not add a normal uninstall option that deletes research data in this migration.
