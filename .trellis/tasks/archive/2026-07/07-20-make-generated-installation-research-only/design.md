# Design: Research-only active generation

## 1. Boundary

Child B changes current desired output, not historical ownership and not source/package deletion.

Three independent sets must never be conflated:

1. **Active Research payload** — files init/update currently write.
2. **Frozen cleanup inventory** — exact historical paths retained after collectors narrow.
3. **Safe-delete authority** — exact migration operations with proven released hashes.

A path leaving set 1 does not enter set 3 automatically. Set 2 remains collector-independent.

## 2. Canonical active payload contract

Add one typed declaration near the current Claude/Codex configurator boundary. It owns:

- nine canonical stage skill names;
- Claude/Codex bounded worker source and destination;
- exact per-host active hook list;
- exact per-host mixed config paths;
- optional Claude statusline path.

It does not own:

- historical cleanup paths;
- migration hashes;
- source deletion;
- external optional skill bodies;
- Research lifecycle meaning.

Both `configurePlatform()` and `collectPlatformTemplates()` consume the same resolved payload functions. Tests compare both directions:

```text
configured files == collected keys
configured bytes == collected bytes
```

Do not globally redefine generic resolvers while Child C sources still exist. Add Research-specific selection helpers and route only current Claude/Codex generation through them.

## 3. Exact host output

### Claude

Opaque retained files:

```text
.claude/agents/trellis-research-worker.md
.claude/skills/trellis-research-{audit,computation,experiment,ideation,literature,quest,setup,theory,writing}/SKILL.md
```

Transition/mixed output:

```text
.claude/hooks/session-start.py
.claude/hooks/inject-workflow-state.py
.claude/hooks/inject-subagent-context.py
.claude/settings.json
.claude/hooks/statusline.py   # optional only
```

Responsibilities:

- `session-start.py`: compact direct Research orientation.
- `inject-workflow-state.py`: strict ledger-head watermark only.
- `inject-subagent-context.py`: explicit C09 `trellis-research-worker` preflight only.
- statusline: bounded Research state plus neutral terminal telemetry; no Task/developer/script state.

### Codex

Opaque retained files:

```text
.codex/agents/trellis-research-worker.toml
.agents/skills/trellis-research-{audit,computation,experiment,ideation,literature,quest,setup,theory,writing}/SKILL.md
```

Transition/mixed output:

```text
.codex/hooks/inject-workflow-state.py
.codex/hooks.json
.codex/config.toml
```

Do not generate `.codex/hooks/session-start.py`. It is currently unregistered and generic. Codex bounded worker performs C07 preflight itself and needs no Claude adapter.

## 4. Hook contracts

### SessionStart

Read only:

- strict bundled Research workflow selection;
- strict ledger head;
- compact Quest projections;
- compact pending Proposal records.

Emit pointers and counts only. No Task/spec/workspace/developer context. No `.trellis/scripts/common` imports. No canonical writes except the existing bounded runtime watermark behavior where explicitly specified.

### Sequence watermark

For Claude and Codex registered UserPromptSubmit-compatible flow:

- derive stable session identity from host input without Task helpers;
- strict-read ledger head;
- equal head -> no output/no write;
- changed valid head -> one compact block + atomic same-dir watermark update;
- missing identity or malformed session state -> no write;
- malformed ledger/selection -> compact validation pointer, no repair;
- never mutate tracked `.trellis/research/**`.

### Claude Dispatch preflight

Preserve C09 byte-level behavior:

- exact one-line envelope;
- root control-plane discovery;
- direct C07 invocation;
- bounded response validation;
- optional skill metadata probe only after pass 1;
- exact final JSON injection;
- deny on typed or local failure;
- no fallback to Task or Python duplicate validation.

All non-worker calls return no Trellis context.

## 5. Minimal `.trellis` layout

`createWorkflowStructure({ layout: "research" })` writes:

```text
.trellis/workflow.md
.trellis/config.yaml
.trellis/.gitignore
```

Init orchestration adds:

```text
.trellis/.workflow.json
.trellis/.template-hashes.json
.trellis/.version
AGENTS.md managed block
```

The Research layout never copies scripts. Legacy layout code may remain temporarily for compatibility/source tests but must be unreachable from active current init.

## 6. Init and re-init state machine

### Fresh

1. Validate current supported options and reject generic-only options before writes.
2. Resolve Claude/Codex selection and Python command only if retained generated Python hooks need it.
3. Resolve bundled Research workflow locally.
4. Write minimal Research base.
5. Configure exact selected host payloads.
6. Merge/write root Research `AGENTS.md` block.
7. Initialize hashes from actual written files.
8. Verify workflow bytes.
9. Atomically record Research workflow hash and selection.

### Host addition

1. Detect existing install and requested missing host.
2. Preserve active workflow bytes/hash/selection snapshot.
3. Configure only missing host Research payload.
4. Restore prior workflow ownership metadata if shared helper calls touched it.
5. Do not run developer setup or create Tasks.

### Full/force

Regenerate current Research managed bytes using existing conflict semantics. Preserve `.trellis/research/**`, modified retired assets, and user bytes outside structured managed regions. Cleanup remains update/migration-owned; re-init must not delete retired files by broad root replacement.

## 7. Update desired state

Narrow `collectTemplateFiles()` inputs to:

- Research-only `.trellis/config.yaml` and `.trellis/.gitignore`;
- state-classified bundled Research workflow;
- managed-block-merged Research `AGENTS.md`;
- exact selected-host Research collectors;
- preserved opted-in Claude statusline state.

Remove active desired inputs:

- `getAllScripts()`;
- `getAllAgents()`;
- registry config/spec templates;
- generic host assets;
- migration Task generation.

Preserve apply ordering:

```text
plan -> backup -> regular migrations -> safe deletes -> manifest prune persist
-> non-workflow writes -> workflow apply/verify -> version -> hashes/selection
```

Do not move safe-delete, backup, workflow ownership, or Research-protection phases.

## 8. Mixed files

Structured merge, never wholesale replace user files:

- `.claude/settings.json`: exact retained Trellis hook/statusline entries; preserve unrelated user fields.
- `.codex/hooks.json`: exact retained Trellis hook entry; preserve unrelated hooks.
- `.codex/config.toml`: remove active generic Trellis blocks while preserving unrelated TOML.
- `AGENTS.md`: replace/append only `<!-- TRELLIS:START -->` through `<!-- TRELLIS:END -->`.

Malformed structured files remain byte-preserved with warning under existing safety contracts.

## 9. Research workflow and local config

### Workflow

Keep scientific lifecycle separate from engineering Tasks. Document only:

- Quest/Campaign/Run/Evidence/Claim;
- stage capabilities and nine fallback skills;
- bounded Dispatch;
- worker Result plus pending Proposal;
- root record/apply/reject authority;
- direct `trellis research` inspection and mutation commands.

No `.trellis/scripts/get_context.py`, Task phase, Channel, Mem, workflow switching, or retired-host branch.

### Config

Prefer the smallest schema with proven readers. Retain `update.skip` compatibility if `update.ts` still consumes it. Existing modified configs follow normal conflict policy; update does not append registry or generic sections.

### Gitignore

Each retained entry must map to a current producer:

- `.runtime/` for Research sequence/session runtime;
- `.backup-*` for update backup;
- `*.tmp` for atomic writes;
- `*.new` for conflict copies;
- Python cache entries only where generated hooks can create them.

## 10. Compatibility and cleanup

Do not edit Child A ownership artifacts unless a verified correctness defect is found:

```text
src/legacy/current-host-generic-cleanup.json
src/legacy/current-host-generic-cleanup.ts
src/utils/manifest-prune.ts
src/migrations/manifests/0.7.0-beta.0.json
```

After collectors narrow:

- frozen keys remain known;
- retained Research outputs remain outside cleanup sets;
- pristine hash-approved historical files may delete;
- modified/unapproved files survive;
- unknown descendants remain unowned;
- structured files use exact scrub/merge only.

## 11. Risk and split gates

Expected high-risk boundaries:

- `init()` / `handleReinit()`;
- Claude/Codex configure and collect parity;
- shared hook templates;
- `collectTemplateFiles()` and `update()`.

Before each existing symbol edit, run fresh GitNexus upstream impact. HIGH/CRITICAL edits require an explicit blast-radius warning before code changes. If an edit requires command unregistration, source deletion, core export removal, docs-site/marketplace work, or migration-schema change, stop and assign it to Child C/C11/C13/C14/C16.

## 12. Rollback

Before Child C, rollback is mechanical:

- restore previous active collectors/configurators and mixed templates;
- restore script generation and migration Task block only if needed;
- leave frozen cleanup inventory and migration evidence intact;
- never restore generic files by overwriting user-modified installed copies;
- use forward fixes for any released migration manifest error.
