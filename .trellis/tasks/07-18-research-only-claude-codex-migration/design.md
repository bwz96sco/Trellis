# Design — Research-only Claude and Codex migration

## Boundaries

- `packages/core/src/research/**` remains canonical, host-neutral authority.
- Current host registry contains only Claude Code and Codex.
- Retired-host cleanup data lives in a separate non-installable inventory.
- Research stage selection becomes a core-owned logical capability contract with bundled fallback skills.
- Claude uses hook validation; Codex uses mandatory pull-based preflight through a read-only Dispatch context command.
- Generic public core exports remain compatible during 0.7 and are removed only in the major release.

## Data flow

```text
Quest stage
  -> core stage capability
  -> host skill-name discovery
  -> optional installed skill or bundled fallback
  -> read-only bounded Dispatch context
  -> Claude hook worker or Codex pull worker
  -> Result + pending Proposal
  -> root record-result
  -> root apply/reject
```

## Ownership model

Each managed path is classified as protected research data, current generated file, legacy generated file, mixed configuration, modified/user-owned file, or unknown manifest entry. Only proven generated ownership permits deletion. Mixed files use structured scrubbers. Unknown entries are released from the manifest without touching disk.

## Compatibility

- No research ledger rewrite.
- `ownerSkill`, `taskRef`, old workflow metadata, Task research metadata, Channel data, and conversation history remain readable/inert.
- Fresh installs stop producing those generic surfaces.
- Marketplace and docs changes require separate repository commits and published gitlinks.

## Rollout

1. Freeze fixtures.
2. Protect research data.
3. Extract cleanup inventory.
4. Narrow current hosts and workflow.
5. Add Codex parity.
6. Remove generic active surfaces.
7. Publish 0.7 bridge.
8. Remove generic SDK exports in 1.0 after deprecation window.
