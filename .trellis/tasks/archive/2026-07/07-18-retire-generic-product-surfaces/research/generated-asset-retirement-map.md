# Generated asset retirement map

## Critical ownership rule

Freeze exact current-host generic generated paths and released hashes before deleting template collectors.

`manifest-prune.ts` retains ownership through active collectors, frozen retired inventory, structured descriptors, and migration endpoints. Collector-first deletion can discard manifest keys and lose evidence needed to delete pristine installed files safely.

## Stop fresh generation

Fresh Research init/update must stop producing:

```text
.trellis/tasks
.trellis/workspace
.trellis/spec
.trellis/agents
.trellis/scripts
.trellis/.developer
```

Remove active generic init paths:

- spec registry/template flags and downloads;
- monorepo spec/package setup;
- developer/workspace onboarding;
- bootstrap/joiner Tasks;
- update-created migration Tasks;
- generic legacy workflow layout.

Keep minimum Research control-plane files:

```text
.trellis/research/**
.trellis/.template-hashes.json
.trellis/.version
.trellis/workflow.md
.trellis/.workflow.json   # fixed Research ownership metadata while consumed
.trellis/config.yaml      # Research/update settings only
.trellis/.gitignore       # Research runtime/update backup only
```

No installed `.trellis/scripts` remain after mixed hooks/workflow stop depending on them.

## Remove generated generic assets

### Host agents

Remove Claude/Codex `trellis-implement`, `trellis-check`, and old `trellis-research`. Keep only bounded `trellis-research-worker` for each host.

### Commands and skills

Remove common generic commands and single-file skills, all Codex generic workflow skills, and bundled:

- `trellis-channel`
- `trellis-session-insight`
- `trellis-spec-bootstrap`
- `trellis-meta`

Keep exactly nine `trellis-research-*` stage capability bundles.

### Generic Trellis templates

Retire `.trellis/scripts/**`, `.trellis/agents/**`, workspace index, generic spec pack, and generic worktree templates.

## Mixed files: narrow, do not delete

Rewrite:

- `shared-hooks/inject-subagent-context.py`: retain C09 worker route only; remove Task/spec/generic-agent injection.
- `shared-hooks/session-start.py`: retain Research ledger/Quest/Proposal orientation only.
- `shared-hooks/inject-workflow-state.py`: retain only necessary Research sequence behavior or remove registration when redundant.
- Research workflow: remove Task/script/retired-host branches.
- root `AGENTS.md` managed block: Research-only, keep ownership markers.
- Claude/Codex settings/hooks: preserve user fields and Research registrations.
- `config.yaml` and `.gitignore`: Research-only keys/paths.
- Claude statusline: retain only if rewritten for Research state; target plan keeps `--with-statusline` Claude-only.

## Cleanup behavior

Add exact current-host retirement inventory plus migration operations before source deletion.

- Known pristine bytes: delete.
- Modified file: preserve and release ownership with warning/result classification.
- Missing file: release ownership.
- Unknown descendant: preserve.
- Mixed file: structured scrub only.
- Directory: remove only when confirmed empty.
- `.trellis/research/**`: always protected.

Retired-host cleanup metadata remains cleanup-only and must not restore active host support.

## Build/package boundary

`copy-templates.js` recursively copies `src/templates/**`; clean build is mandatory before package audit. Published package must exclude generic commands/agents/skills/spec/scripts while retaining:

- bounded Claude/Codex Research workers;
- nine Research stage bundles;
- migration manifests;
- retired-host cleanup metadata.

`docs-site` and `marketplace` remain independent C13/C14 work.
