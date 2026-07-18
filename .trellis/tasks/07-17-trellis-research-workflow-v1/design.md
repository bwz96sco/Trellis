# Design — Trellis research workflow V1

## Authority

```text
Stage-owner artifact
  -> Evidence / Claim
  -> Campaign
  -> Quest
  -> optional Trellis Task
  -> Mempal semantic projection
  -> raw session history
```

- Root workspace is sole supported canonical-state writer.
- `.trellis/research/events.jsonl` owns IDs, transitions, relations, dispatch provenance, and accepted digests.
- Markdown/code/data artifacts own detailed science.
- Tracked JSON files are deterministic projections with `projectedThroughSeq`.
- Runtime absolute paths, locks, sequence cache, and manifests stay under ignored `.trellis/.runtime/research/`.

## Tracked layout

```text
.trellis/.workflow.json
.trellis/research/
  workspace.json
  repositories.json
  events.jsonl
  quests/<id>/{quest.json,brief.md}
  campaigns/<id>/{campaign.json,protocol.md,verdict.md}
  runs/<id>/{run.json,notes.md}
  evidence/<id>/evidence.json
  claims/<id>/claim.json
  dispatches/<id>/{request.json,result.json,proposal.json,decision.json}
```

## Runtime layout

```text
.trellis/.runtime/research/
  seq
  write.lock
  repo-bindings.json
  resolved-repositories.json
  dispatches/<id>/manifest.json
```

## Domain

- Quest: active research router; stage selects exactly one owner skill.
- Campaign: bounded evidence program; protocol digest freezes before Runs.
- Run: one reproducible execution pinned to repo revision, command, config, data, environment, seed, and outputs.
- Evidence: accepted source/result/counterexample linked to Claims.
- Claim: scoped proposition with support, counterevidence, missing evidence, and falsification condition.
- Task: optional bounded engineering unit only.

Use prefixed `crypto.randomUUID()` IDs. Artifact refs use repository-relative POSIX paths plus optional revision/SHA-256. No tracked absolute paths.

## Event and projection flow

1. Strict-parse ledger.
2. Reconcile sequence.
3. Reduce state.
4. Validate complete mutation/proposal batch.
5. Append contiguous event batch under filesystem lock.
6. Update sequence cache.
7. Atomically rewrite affected projections.
8. Recover projection failures through explicit deterministic rebuild.

Research parser fails on malformed canonical lines. Channel API/storage remains separate; only generic lock/sequence algorithms may be shared.

## Dispatch flow

1. Root reads Quest and selects owner skill.
2. Root resolves one registered child repo.
3. Root prepares portable request + ignored absolute runtime manifest.
4. Claude Agent hook validates explicit request pointer and injects bounded context.
5. Worker modifies only allowed child artifacts and returns Result + Proposal.
6. Root records Result, reviews artifacts/revision/checks, then applies or rejects Proposal.
7. Apply validates artifact refs and appends an idempotent event batch.

Root-only authority is workflow/API policy, not a security sandbox.

## Workflow and hooks

- Generalize bundled workflow registry to `native` + `research`.
- Track selected workflow in `.trellis/.workflow.json`.
- Hash-track bundled workflows; preserve marketplace/custom files as user-owned.
- SessionStart emits compact Quest pointer summary.
- UserPromptSubmit stays silent unless research ledger sequence changed.
- PreToolUse Agent handles explicit `Research dispatch:` pointers.
- No Stop/SessionEnd/general PostToolUse hook.

## Compatibility

- Native remains default.
- Existing projects without research state remain unchanged.
- Existing Task schema/phase stays unchanged; links use namespaced `meta.research`.
- Existing legacy research artifacts remain in place and may be linked through reviewed setup proposals.
- Other platforms keep existing behavior; manual CLI remains available.
- Mempal refs are optional IDs only; no hard dependency or automatic writes.

## Rollback

Each child deliverable is additive and independently removable. Selecting native disables research workflow behavior without deleting research data. Ledger writes never trigger automatic data deletion or reverse migration.
