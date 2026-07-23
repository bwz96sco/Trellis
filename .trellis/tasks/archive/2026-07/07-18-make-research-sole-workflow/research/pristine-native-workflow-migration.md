# Research: Pristine native workflow migration

- **Scope**: C05 planning
- **Date**: 2026-07-20

## Ownership evidence

Two independent signals exist:

1. `.trellis/.workflow.json` identifies bundled variant and provenance.
2. `.trellis/.template-hashes.json` proves current normalized bytes still match last managed bytes.

Selection alone does not prove unmodified content. Hash alone does not prove variant after workflow switching became available.

## Safe classifier

| Selection | Content/hash evidence | Classification | Action |
|---|---|---|---|
| Research | Current Research bytes | Already current | Repair missing/stale hash only |
| Research | Matching stored hash, older Research bytes | Pristine older Research | Update to current Research |
| Research | Hash absent/mismatch and bytes differ | Modified Research | Preserve/conflict flow |
| Native | Exact current bundled native bytes | Proven pristine native | Migrate to Research |
| Native | Matching stored hash | Proven pristine managed native | Migrate to Research |
| Native | Neither exact bytes nor matching hash | Modified/ambiguous native | Preserve/conflict flow |
| Missing | Exact current native bytes | Proven legacy native | Migrate to Research |
| Missing | Matching hash and installed version predates workflow switching | Proven legacy managed native | Migrate to Research |
| Missing | Research bytes plus matching Research hash | Lost Research metadata | Repair Research selection |
| Missing | Matching hash on newer/unknown version but unknown variant | Ambiguous managed content | Preserve |
| Missing | No ownership evidence | Custom/user-owned | Preserve |
| Invalid | Any | Invalid metadata/user-owned | Warn and preserve |
| Any | Missing/non-regular/unreadable path | User-deleted or unsafe | Preserve/manual resolution |

Workflow switching first shipped in `0.6.0-beta.17`; matching-hash inference without selection must be version-bounded after that point unless bytes exactly match a known bundled variant.

## Apply contract

Update migration order:

1. Load strict selection state and validated hash manifest.
2. Classify without writes.
3. Render workflow-specific plan and warnings.
4. Exit with zero writes on dry-run or cancellation.
5. Create backup excluding protected `.trellis/research/**`.
6. Re-read workflow bytes immediately before mutation.
7. Preserve if bytes changed after planning.
8. Atomically write bundled Research workflow when migration is accepted.
9. Verify active bytes are Research.
10. Refresh workflow hash.
11. Atomically write bundled Research selection only after successful active write.
12. Advance version without suppressing future retry of skipped/failed migration.

## Conflict actions

| Action | Active bytes | Hash | Selection |
|---|---|---|---|
| Auto-migrate pristine native | Research | Research hash | Research |
| Explicit overwrite | Research | Research hash | Research |
| Skip | Unchanged | Unchanged | Unchanged |
| Create `.new` | Active unchanged; Research sibling created | Unchanged | Unchanged |
| Metadata repair | Research unchanged | Repair | Research |
| Concurrent change/write failure | Preserve recoverable state | Do not falsely refresh | Do not transfer |

## Idempotency

- Successful migration → later update performs no workflow change or backup churn.
- Skipped/custom/invalid state → later update repeats warning/decision; no ownership transfer.
- Research bytes with native/missing metadata → repair metadata without rewriting bytes.
- Missing workflow with stale hash → respect user deletion.
- `.new` creation does not activate Research or transfer ownership.

## Safety boundaries

Never auto-migrate from:

- invalid selection metadata;
- hash mismatch or absent proof with unknown bytes;
- path location alone;
- manifest key retention alone;
- symlink/directory/non-regular path;
- content changed after planning;
- failed backup;
- failed target write;
- skipped or create-new conflict result.

Never read, hash, copy, move, rewrite, or delete `.trellis/research/**` as part of workflow migration.

## Rollback

Restore a consistent snapshot of:

- `.trellis/workflow.md`;
- `.trellis/.workflow.json`;
- `.trellis/.template-hashes.json`;
- `.trellis/.version` when rolling back CLI version.

Restoring only workflow bytes leaves runtime selection and ownership inconsistent. C03 cleanup inventory and migration manifests are unrelated and must remain unchanged.

## Main files

- `packages/cli/src/commands/init.ts`
- `packages/cli/src/commands/update.ts`
- `packages/cli/src/commands/workflow.ts`
- `packages/cli/src/utils/workflow-selection.ts`
- `packages/cli/src/utils/workflow-resolver.ts`
- `packages/cli/src/utils/template-hash.ts`
- `packages/cli/src/configurators/workflow.ts`
- `packages/cli/src/templates/shared-hooks/session-start.py`
- `packages/cli/src/templates/shared-hooks/inject-workflow-state.py`
