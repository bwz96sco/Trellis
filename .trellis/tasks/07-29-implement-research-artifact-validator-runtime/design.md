# P2-03 design — Implement Research artifact validator runtime

## Boundary

Add generic artifact, provenance, terminal-state, trusted-validator, deterministic-report, root-only composition, and Context-v2 enforcement without widening worker authority.

This child follows the parent hybrid architecture: enumerated digest-bound support packs carry methodology data; versioned trusted Trellis runtime code parses, validates, reports, and enforces authority. Workers never discover pack files or execute validators.

## Predecessor

P2-02 accepted with stable schema-v2 pack parsing, digest binding, and historical resolution.

The task must verify predecessor evidence directly; parent/child ordering is not dependency enforcement.

## Owned surfaces

- Exact paths frozen in the parent `research/path-ownership-map.md`.
- Child-approved generic artifact-contract, validator-registry, report, and composition modules under core/CLI Research.
- `dispatch-approved-context.ts`, Result-recording validation entry points, shared hook, generic worker v1/v2 parsing, and `packages/core/src/research/index.ts`.
- P2-03 exports the generic APIs through the existing `@mindfoldhq/trellis-core/research` subpath; P2-12 does not own or reopen that public barrel.
- No family-specific methodology rules or registry version cutover.

Before editing any existing function, class, or method, run GitNexus upstream impact analysis. HIGH or CRITICAL impact requires warning and confirmation before edits.

## Contract and data flow

```text
pinned v1.2 contract slice
  -> child-owned Trellis-native package/runtime/test implementation
  -> deterministic focused validation
  -> frozen DFT/COMP/CTRL slice report
  -> independent review
  -> accepted dormant deliverable or reviewed integration result
```

All worker recommendations remain Result plus pending Proposal. Root-side trusted validation and root-owned Decision remain the only closure/mutation path.

## Root-side composition contract

P2-03 owns the generic runtime needed by the three frozen composition edges. A strict `ResearchCompositionDescriptorV1` (or equivalently named frozen contract) is created and authorized by the root only and is deterministically bound to canonical Research records.

The descriptor binds:

- stable composition and frozen edge IDs;
- parent Dispatch and Activation identity;
- allowed child capability or explicitly bounded adapter;
- exact maximum child count and remaining budget;
- root authorization evidence and Procedure/policy/request digests;
- non-transitive chaining and no-worker-launch rules;
- ordinary-handoff distinction;
- failure, cancellation, and rollback evidence.

For Research-to-Research composition, child Dispatches carry the authorized descriptor identity/digest in their root-created request context, and count enforcement is derived from canonical Dispatch/Activation records. For `research-slides -> personal-slides`, the same contract binds a root-executed bounded adapter and its result evidence rather than granting the worker external launch authority.

P2-08, P2-10, and P2-11 own edge-specific pack descriptors and fixtures. P2-12 wires reviewed bindings during atomic activation. No family child or worker may define a second composition authority.

The local `research/expansion-case-map.json` is mandatory acceptance input. It contains authorized-positive and adversarial cases for edge/parent/digest binding, root authorization, child budget, non-transitivity, worker launch prohibition, cancellation, child failure, adapter unavailability, and zero-write rollback. Frozen `COMP-*` cases remain part of the 229; these expansions are counted separately.

If existing canonical records cannot bind this contract safely, P2-03 must stop and propose a separately reviewed state-migration amendment; existing `types.ts`, `schema.ts`, `events.ts`, and `reducer.ts` are not silently added to scope.

## Compatibility

- Existing Procedure `1.0.0` bytes and schema-v1 digest behavior remain unchanged unless this task is P2-12 and the explicit cutover contract applies.
- Existing schema-v1 Research events and schema-v2 activation/approval events remain replayable.
- Existing activations resolve their recorded Procedure ID/version/digest and do not inherit newer methodology.
- Present-invalid project overrides fail closed and never fall back.
- Optional figure, slides, and survey capabilities remain explicit/non-default.

## Privacy

Only Trellis-native implementations, abstract contracts, approved evidence IDs/digests, and synthetic fixtures may be tracked. Private source bodies and raw evidence remain outside Trellis.

## Rollback

Revert additive artifact/validator/report and Context-v2 handling; Context v1 and live v1 Procedures remain unchanged.

## Deferred risk

The Phase-1 live-trial waiver permits deterministic planning/implementation evidence only. This child must not claim live host/model equivalence.
