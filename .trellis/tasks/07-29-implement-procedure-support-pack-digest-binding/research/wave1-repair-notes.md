# Wave-1 repair notes (schema-v2 resolution)

## Status

Implemented forward repair while `RESEARCH_PROCEDURE_CURRENT_VERSION` remains `1.0.0` (Wave-0 containment).

## Changes

1. Explicit package schema discriminator via `resolveProcedurePackageSchemaVersion`:
   - `packageSchemaVersion: 1|2` preferred
   - immutable fixture transitional rule: version exactly `2.0.0` ⇒ schema-v2
   - other `2.x` versions require explicit `packageSchemaVersion: 2` (for `2.0.1+`)
2. Schema-v2 requires `methodology/` + `methodology/pack.json` + full inventory; never optional.
3. Schema-v1 rejects presence of `methodology/pack.json`.
4. Support-pack manifest is a closed object (unknown keys fail); optional methodology contract fields; entry `workerVisibility` (default worker-visible).
5. On-disk `pack.json` must already be canonical stable serialization (no silent rehash of rewritten form).
6. `ParsedResearchProcedure` retains support-pack manifest, pack bytes, full inventory, and worker-visible inventory.

## Immutable fixtures

- `1.0.0` and `2.0.0` package bytes unchanged.
- Repaired packs remain planned as `2.0.1`.
