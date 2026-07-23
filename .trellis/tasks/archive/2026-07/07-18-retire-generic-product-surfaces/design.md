# Design: staged retirement of generic product surfaces

## 1. Principle

Retire current product capability, not history.

```text
active collector/command/template
  -> frozen ownership + cleanup path
  -> Research-only replacement generation
  -> source/registration deletion
```

Never reverse this order.

## 2. Final active architecture

### CLI

```text
trellis init
trellis update
trellis upgrade
trellis uninstall
trellis research ...
```

Research remains host-neutral in core. Claude/Codex adapters retain only bounded Research hooks/workers and exact stage skills.

### Generated control plane

Minimum managed layout:

```text
.trellis/
  research/**
  .template-hashes.json
  .version
  workflow.md
  .workflow.json
  config.yaml
  .gitignore
AGENTS.md managed Research block
.claude/ Research hooks, worker, skills, optional statusline
.codex/ Research hooks, worker, skills
```

`.workflow.json` remains fixed bundled-Research ownership metadata while update classification consumes it. It is not a switching UI.

No fresh `.trellis/tasks`, workspace, spec, agents, scripts, or developer state.

## 3. Ownership model

### Current Research assets

Active collectors own exact current Research outputs and mixed-file registrations.

### Retiring current-host assets

Child A freezes exact paths plus released hashes/structured cleanup descriptors before collectors narrow. These records provide cleanup-only recognition, not installability.

### Retired hosts

Existing C03 inventory remains separate. Never reintroduce configurators or active templates.

### User data

- Hash match -> safe delete.
- Hash mismatch -> preserve, release ownership, report modified.
- Unknown path -> preserve.
- Mixed config -> exact structured scrub only.
- Directory -> remove only when empty.
- `.trellis/research/**` -> protected regardless of manifest input.

## 4. Mixed-file transition

### Hook adapter

`inject-subagent-context.py` keeps C09 explicit Research worker path only. Remove Task/spec/generic agent injection.

### Session orientation

`session-start.py` emits Research ledger/Quest/pending Proposal orientation. Remove developer/workspace/Task/spec/phase context.

### Workflow-state hook

Keep only a proven Research sequence-change need. If SessionStart plus explicit Dispatch makes it redundant, remove registration and clean its managed file through ownership rules.

### Workflow guide

Research lifecycle and Dispatch only. No Task tooling, `.trellis/scripts`, retired hosts, generic coding workflow, or active marketplace switching.

### Root instructions/config/statusline

Keep mixed ownership markers and user fields. Managed content becomes Research-only. `--with-statusline` remains Claude-only with Research state; if no bounded Research implementation is useful, remove the generated statusline while retaining option compatibility decision in child B.

## 5. Command/data split

Remove CLI Channel/Mem/Workflow/Task-link registrations and command-only implementation in child C.

Retain generic core domains through 0.7:

```text
@mindfoldhq/trellis-core/channel
@mindfoldhq/trellis-core/mem
@mindfoldhq/trellis-core/task
```

Retain historical data and readers. C16 owns semver-major API/source removal.

## 6. Init/update/uninstall

### Init

Remove generic template/registry/monorepo/developer/Task branches. Hosts remain Claude/Codex. Research initialized by default.

### Update

- apply frozen cleanup before pruning ownership;
- stop registry/spec refresh and generic agent/script recreation;
- never create migration Tasks;
- retain historical workflow classification only for preservation/migration;
- generate retained Research assets byte-identically with init.

### Uninstall

Use C02 ownership safety. Preserve canonical Research by default. Delete only exact owned hash matches and scrub mixed registrations. Historical user-authored Task/workspace/spec content survives.

## 7. CLI compatibility fields

Historical schema-v1 fields remain readable.

Compatibility boundary:

- retain caller-provided `--owner-skill`, `--provider`, and `--task-ref` parsing and schema behavior through 0.7;
- treat all three fields as readable compatibility metadata, never execution or routing authority;
- resolve current capability ownership from the Quest stage without rewriting historical Dispatch events.

No ledger rewrite.

## 8. Child boundaries

### A — ownership freeze

May add migration/inventory/tests and adjust prune classification. Must not delete active collectors or generic sources.

### B — Research-only generation

May narrow init/update/configurators/templates/mixed hooks and tests. Cleanup ownership from A must already cover everything retired. Active generic command registration remains until C.

### C — active source/payload removal

May unregister/delete commands and caller-free templates/utilities/tests/specs after B proves no generation/runtime dependency. Must retain core exports and cleanup metadata.

Parent runs combined integration review after C.

## 9. Test contracts

- exact root and Research command sets;
- no-write negative retired commands;
- exact fresh Claude/Codex payload allowlists;
- init/update byte parity for retained files;
- pristine/modified/unknown/mixed cleanup matrix;
- protected Research tree snapshots;
- schema-v1/C07/C09 regressions;
- workflow ownership compatibility;
- frozen core export resolution;
- clean package file list.

## 10. Rollback

- Child A failure: no collectors deleted; remove new inventory/migration only.
- Child B failure: restore narrowed generation while keeping safe inventory; never restore generic files over modified user content.
- Child C failure: restore registrations/source through Git changes; keep cleanup metadata and Research state untouched.
- Aggregate failure: C10 parent remains open; C11-C16 stay blocked.
- No reset, clean, stash, force push, history rewrite, or Research ledger migration.
