---
name: research-quest
description: Resume named research quests read-only from research-quest.yaml. Use for a named quest's recorded state or current decision, active blocker, exact next action, acceptance gate, or next owner. Do not use for generic project status, planning, or advice without recorded quest state; campaign-internal result analysis; or initialization, mutation, and ownership-changing work.
---

# Research Quest

Read-only named quest router. `research-quest.yaml` indexes state; stage evidence stays authoritative.

## Resume

1. Confirm the request identifies a named quest and asks about its recorded state or decision. Resolve the project root; inspect first and ask only when the target quest is ambiguous.
2. Read `research-quest.yaml` directly when state is bounded and unambiguous.
3. Otherwise run read-only helper:

```bash
uv run python <research-quest-skill-dir>/scripts/research_quest.py status --root <project>
```

Resolve skill dir from loaded `SKILL.md`; never assume project contains skill repo.

Return current stage, current decision when requested, active blocker, exact next action, acceptance gate when present, and one active owner skill. When legacy `board.stale_routes` is present and valid, surface it as retired or parked context; never recommend or revive a listed route. If a stale route conflicts with `current_decision` or `next_action`, report stale or ambiguous state and stop without inferring a replacement route. Do not open evidence by default. Open at most one cited evidence file only when user requests verification or state cannot determine route. Missing pointer -> warn once and stop; never search substitutes.

## Legacy Read Compatibility

Helper projects `version: 1`, schema `0.1`, and schema-less state in memory without rewriting source. Preserve scalar `next_action` text exactly. Map short stage names only when owner is known. Report unknown stages; never invent route.

`validate` is also read-only:

```bash
uv run python <research-quest-skill-dir>/scripts/research_quest.py validate --root <project>
```

## Admin Redirect

Initialization, migration, quest mutation, event append, status regeneration, task-forest bridge, or campaign indexing belongs to explicit `$research-quest-admin`.

For such request: name that workflow, state expected write boundary, then stop. Perform no write, schema upgrade, status regeneration, event append, or planning projection.
