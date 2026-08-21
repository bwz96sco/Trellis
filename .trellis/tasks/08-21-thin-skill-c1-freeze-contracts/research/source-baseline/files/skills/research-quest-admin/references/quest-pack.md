# Quest Pack Operations

Load only for explicit durable-state work.

## Files

```text
research-quest.yaml                       # editable source
research-events.jsonl                     # reviewed milestones
note/<vault>/_quest/QUEST_STATUS.md        # generated projection
notes/_quest/QUEST_STATUS.md               # fallback projection
```

`QUEST_STATUS.md` is generated. Source edits belong in `research-quest.yaml`.

## Initialize

Preview first; add `--write` only after paths are correct.

```bash
uv run python <research-quest-admin-skill-dir>/scripts/research_quest_admin.py init --root <project>
uv run python <research-quest-admin-skill-dir>/scripts/research_quest_admin.py init --root <project> --write
```

`--force` replaces existing initialized files. Use only with explicit overwrite authorization.

## Migrate

Reading legacy state never upgrades it. Migration creates `research-quest.yaml.pre-migration.bak`, preserves scalar `next_action`, refuses owner inference, then regenerates status and validates.

```bash
uv run python <research-quest-admin-skill-dir>/scripts/research_quest_admin.py migrate --root <project>
uv run python <research-quest-admin-skill-dir>/scripts/research_quest_admin.py migrate --root <project> --write
```

Resolve reported owner decisions before retry. `--force` may replace existing migration backup only with explicit authorization.

## Owned State

- New or deliberately upgraded state uses schema `0.2`.
- `research-quest-admin` owns quest source mutation; active stage skill owns stage artifacts and claims.
- Every authoritative artifact has relative `path` and `owner_skill`.
- Every claim has one `owner_skill`; `supported` and `partial` claims cite evidence paths.
- Each branch has one current owner. Competing owners cannot mutate same artifact or claim.
- `active_stage` plus structured `next_action` form mainline route.
- `board` is optional legacy detail. Bulky outputs stay in stage-owned storage.

## Update

Change source only for real branch, owner, claim, blocker, decision, or next-action transition. Regenerate and validate:

```bash
uv run python <research-quest-admin-skill-dir>/scripts/research_quest_admin.py status --root <project> --write
uv run python <research-quest-admin-skill-dir>/scripts/research_quest_admin.py validate --root <project>
```

Append event only for reviewed milestone: route or branch change, evidence-backed claim change, decision, blocker transition, handoff, campaign boundary, or closure.

```bash
uv run python <research-quest-admin-skill-dir>/scripts/research_quest_admin.py append-event \
  --root <project> --event <reviewed-event.json> --write
```

Reads, routine validation, formatting, and unchanged artifacts do not enter event log.
