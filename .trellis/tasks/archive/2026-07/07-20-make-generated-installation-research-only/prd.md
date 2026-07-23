# Make generated installation Research-only

## Goal

Make fresh init, host-addition re-init, full/force re-init, and update generate only the Research control plane for Claude Code and Codex. Stop producing generic Task, workspace, spec, developer, script, command, agent, skill, and onboarding assets while preserving historical user content, cleanup ownership, workflow compatibility, and canonical Research state.

## Requirements

### Active generated payload

- Support current generation for Claude Code and Codex only.
- Fresh/full Research installation contains only:
  - `.trellis/.template-hashes.json`;
  - `.trellis/.version`;
  - `.trellis/workflow.md`;
  - `.trellis/.workflow.json`;
  - `.trellis/config.yaml`;
  - `.trellis/.gitignore`;
  - root `AGENTS.md` managed Research block;
  - selected Claude and/or Codex Research assets.
- Canonical `.trellis/research/**` remains lazy runtime state. Init and re-init must not create, hash, migrate, replace, back up, or delete it.
- Do not generate or recreate:
  - `.trellis/scripts/**`;
  - `.trellis/agents/**`;
  - `.trellis/tasks/**`;
  - `.trellis/workspace/**`;
  - `.trellis/spec/**`;
  - `.trellis/.developer`;
  - generic commands, agents, skills, spec packs, onboarding Tasks, or migration Tasks.

### Host payload contract

- Define one canonical active Research payload contract shared by configure and collect paths.
- Claude receives exactly:
  - `trellis-research-worker.md`;
  - nine `trellis-research-*` stage skills;
  - Research-only `session-start.py`;
  - Research-only sequence watermark hook;
  - C09 explicit Dispatch preflight hook;
  - structured `.claude/settings.json` registrations;
  - optional Research-only statusline when `--with-statusline` is selected or already managed.
- Codex receives exactly:
  - `trellis-research-worker.toml`;
  - nine `trellis-research-*` stage skills;
  - one registered Research sequence hook;
  - structured `.codex/hooks.json` and `.codex/config.toml` state.
- Do not generate the current unregistered generic Codex `session-start.py`.
- Codex worker keeps its own C07 pull preflight; do not copy the Claude prompt-mutation adapter.
- Every retained file written by a configurator must appear byte-identically in its collector, and every collected file must be written by the configurator.

### Research-only mixed assets

- `session-start.py` reads only workflow selection and compact canonical Research state. No Task, developer, workspace, spec, monorepo, or generated-script dependency.
- Sequence hook remains silent when unchanged, idempotent, session-scoped, atomic, and Research-ledger-sequence aware.
- Claude preflight hook retains C09 exact-envelope, deny-on-failure, two-pass optional-skill, and exact C07 JSON injection behavior. Non-worker calls receive no generic context injection.
- Claude statusline remains optional and reports bounded Research state instead of Task/developer state.
- Research workflow contains only Research lifecycle, stage capability, Dispatch, Result, Proposal, root-review, and direct `trellis research` guidance. It must not require `.trellis/scripts` or optional engineering Tasks.
- Root `AGENTS.md` managed block contains only Research guidance and preserves all user bytes outside Trellis markers.
- `.trellis/config.yaml` contains only proven Research/update settings; retain `update.skip` compatibility if still consumed.
- `.trellis/.gitignore` contains only current Research runtime, atomic-write, update-backup, conflict-copy, and generated-hook cache entries with named consumers.
- Claude/Codex structured config merges preserve unrelated user fields and hooks.

### Init and re-init

- Fresh init selects Claude/Codex, installs bundled Research workflow, writes exact active assets, then records hashes and workflow ownership only after byte verification.
- Normal host-addition re-init adds only the requested host Research payload.
- Host addition preserves custom/modified workflow bytes, workflow hash, and selection metadata.
- Full/force re-init refreshes current Research assets without mutating canonical Research state or using generic cleanup as overwrite authority.
- Remove active developer initialization, joiner/onboarding Task creation, project-type/monorepo generation, registry/spec download, and generic template generation.
- Until Child C removes generic-only parser flags, any supplied generic-only init option must fail before writes with a bounded unsupported-in-Research-mode error; do not silently ignore it.

### Update

- Update desired-state collection uses the same Research payload contract as init.
- Update does not regenerate scripts, generic agents, generic host commands/skills, registry specs, monorepo state, or migration Tasks.
- Existing historical Task/workspace/spec/developer/custom workflow content remains inert user data and is not deleted because it left the active generator.
- Keep backup ordering, workflow classification, conflict policy, hash tracking, manifest pruning, regular migrations, protected paths, and safe-delete execution order unchanged unless a verified defect requires a separately reviewed edit.
- Current-template precedence still suppresses historical deletion for retained paths.
- Removing a path from active collection is not deletion authority. Only existing hash-proven migration operations may delete pristine historical bytes.
- Update must preserve `.trellis/research/**` byte-for-byte.

### Compatibility boundary

- Keep Child A inventory cardinalities and exact sets unchanged.
- Keep `buildKnownKeys()` frozen cleanup union unchanged.
- Keep `0.7.0-beta.0.json` published hash evidence unchanged.
- Keep generic source templates and command implementations in the package during Child B; Child C owns caller-free source and packed-payload deletion.
- Keep 0.7 core Channel/Mem/Task compatibility exports untouched.
- Do not modify `docs-site` or `marketplace`.
- No automatic Git commit.

## Constraints

- Before editing any existing function, class, or method, run GitNexus upstream impact analysis and report direct callers, affected flows, and risk.
- Warn and stop for user-visible review before any HIGH or CRITICAL symbol edit not already bounded by this design; split the task if impact crosses Child C or compatibility boundaries.
- Do not use active collectors as historical cleanup inventory.
- Do not recursively delete retired roots or overwrite modified historical files.
- Do not reintroduce other hosts, Channel, Mem, workflow switching, or Research Task links.
- Do not copy, inspect, vendor, or depend on private unprefixed Research skill bodies.

## Acceptance Criteria

- [x] One canonical active Research payload contract drives Claude/Codex configure and collect paths.
- [x] Claude collector emits exactly one bounded worker, nine stage skills, approved Research hooks/config, and optional Research statusline.
- [x] Codex collector emits exactly one bounded worker, nine stage skills, one registered Research sequence hook, and approved structured config.
- [x] Configurators write exactly and only collected files, byte-for-byte.
- [x] Fresh Claude-only, Codex-only, and dual-host installs match exact allowlists.
- [x] Fresh/full init creates no scripts, agents, Tasks, workspace, specs, developer file, or canonical Research directory.
- [x] Host-addition re-init creates no generic state and preserves workflow ownership.
- [x] Full/force re-init is byte-idempotent and preserves canonical Research state.
- [x] Generic-only init options fail before writes while parser compatibility remains until Child C.
- [x] Update does not recreate retired scripts, agents, commands, skills, specs, developer state, or Tasks.
- [x] Update creates no migration Task and performs no registry/spec refresh.
- [x] Retained init and update output is byte-identical.
- [x] All generated Trellis hooks are registered; all registered Trellis hooks are generated.
- [x] Generated hooks contain no Task/spec/workspace/developer/generated-script dependency.
- [x] Claude C09 Dispatch preflight remains fail-closed and ordinary agent calls remain no-op.
- [x] Sequence watermark remains silent, atomic, idempotent, and Research-only.
- [x] Optional Claude statusline is deterministic and Research-only.
- [x] Research workflow, config, gitignore, and managed `AGENTS.md` contain no active generic product references.
- [x] `AGENTS.md`, Claude settings, Codex hooks, and Codex config preserve unrelated user content.
- [x] Frozen 137-path cleanup inventory, migration hash evidence, and unknown-descendant behavior remain unchanged.
- [x] Modified, malformed, unknown, and user-owned historical content survives update/uninstall compatibility tests.
- [x] `.trellis/research/**` is byte-identical through init/re-init/update/uninstall compatibility paths.
- [x] Generic source/template deletion remains deferred to Child C.
- [x] Focused tests, full CLI tests, core tests, lint, Python lint, typecheck, build, source/build parity, and `git diff --check` pass.
- [x] Independent `trellis-check` reports no unresolved blocker.
- [x] Task archives with `--no-commit` before Child C starts.
