# T0A — Exact CRITICAL Procedure routing authority overlay design

## Boundary

T0A is a governance-only overlay. It does not perform the T2 production edit. The standalone task's `task.json` is the normative prospective authorization; the remaining standard task files document the boundary and verification path.

```text
committed G0/T0 governance + committed T1 interface
  + existing T2 authorization and CRITICAL impact record
    -> lean standalone T0A task.json authority
    -> separately committed T0A boundary
    -> separately executed and committed T2 edit
```

## Topology and ownership

T0A remains outside the existing eight-child campaign tree:

- `parent: null`
- `children: []`
- governed campaign: `implement-evaluation-contract-v1-3-1-technical-successor`
- original T0: `govern-evaluation-contract-v1-3-1-technical-successor`
- target task: `conform-cli-to-evaluation-contract-v1-3-1`
- target stage: `T2`

T0A owns exactly six standard files in its task directory: `task.json`, `prd.md`, `design.md`, `implement.md`, `implement.jsonl`, and `check.jsonl`.

## Authority model

The governance actor is `claude-t0a-governance-amendment-author`. The prospective target actor is the distinct `claude-t2-cli-implementer`.

Only this future T2 delta is approved:

```ts
import { parseAcceptedV131ResearchProcedure } from "@mindfoldhq/trellis-core/research";

// Inside parseSelectedProcedure only.
if (
  context === "activation-recorded" &&
  recordedProcedureVersion === "2.0.7" &&
  packageSchemaVersion === 2
) {
  return parseAcceptedV131ResearchProcedure(existingParserInput);
}
return parseResearchProcedure(existingParserInput);
```

The snippet defines the authority boundary, not the exact implementation text. All three route conditions are required. The import must be a same-file named import from the public Core Research subpath. Core remains responsible for accepted v1.3.1 Procedure parsing and authentication.

## Compatibility and containment

The future T2 edit must preserve project-first resolution, absent-only bundled fallback, present-invalid fail-closed behavior, and recorded Procedure identity for replay. Live `1.0.0` and historical `2.0.0` through `2.0.6` continue through `parseResearchProcedure`. Procedure `2.0.7` remains dormant and is not selected live.

Matching by schema version alone, major version, current registry selection, or support-pack inference is prohibited. No event, reducer, store, repository, projection, ledger, committer, lock, publication, worker-authority, or live-selection ownership changes.

## Inventory and denials

The existing T2 inventory remains exactly 32 paths with its frozen canonical digest. T0A does not amend that inventory or the eight-child topology.

T0A's execution and separate commit boundary are authorized, and its exact prospective CRITICAL approval is authorized. Production implementation by T0A and every activation, package, provider, publication, release, push, archive, repair, acceptance, worker-authority, and later-stage operation remain unauthorized.

## Return boundary

This implementation updates and validates the six T0A files without staging or committing. After a separately performed T0A commit, T2 may cite that committed `task.json`, refresh impact analysis, and implement only the exact authorized route within its unchanged inventory.
