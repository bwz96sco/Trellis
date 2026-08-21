---
name: research-quest-admin
description: Update named research-quest state by appending reviewed milestones and exact next actions; also initialize, migrate, regenerate, or bridge durable quest files through an explicit write-capable workflow.
disable-model-invocation: true
---

# Research Quest Admin

Explicit workflow for durable quest writes. Stage trackers and evidence remain authoritative.

## Preflight

1. Resolve named project root.
2. Read `research-quest.yaml`, `research-events.jsonl`, canonical `QUEST_STATUS.md`, and affected stage tracker when present.
3. State intended files, owner changes, and command before mutation.
4. Use admin helper `--write` for mutations. Without `--write`, commands preview or read only.

Resolve `<research-quest-admin-skill-dir>` from loaded `SKILL.md`.

## Operations

Load [quest-pack.md](references/quest-pack.md) for initialization, migration, state mutation, event append, or status regeneration.

- Initialize missing quest files with schema `0.2`.
- Migrate legacy state only as explicit operation; preserve source backup and scalar next-action text.
- Mutate only real branch, owner, claim, blocker, decision, or next-action transitions.
- Append reviewed milestone events, never reads or routine validation.
- Regenerate `QUEST_STATUS.md` from source; never edit projection as source.
- Validate after every write.

Load [campaign-index.md](references/campaign-index.md) only for named multi-run campaign indexing. Campaign tracker owns runs, metrics, and stop rules; quest stores route and pointer only.

Load [task-forest-bridge.md](references/task-forest-bridge.md) only for explicit task graph or durable dependency view. Quest state and research evidence stay authoritative.

## Commands

```bash
uv run python <research-quest-admin-skill-dir>/scripts/research_quest_admin.py init --root <project> --write
uv run python <research-quest-admin-skill-dir>/scripts/research_quest_admin.py migrate --root <project> --write
uv run python <research-quest-admin-skill-dir>/scripts/research_quest_admin.py status --root <project> --write
uv run python <research-quest-admin-skill-dir>/scripts/research_quest_admin.py append-event --root <project> --event <reviewed-event.json> --write
uv run python <research-quest-admin-skill-dir>/scripts/research_quest_admin.py validate --root <project>
```

Complete when intended state transition is written, projection regenerated when needed, validator has no hard failure, and every changed path is reported.
