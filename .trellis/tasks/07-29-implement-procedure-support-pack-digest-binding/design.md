# P2-02 design — Implement Procedure support-pack digest binding

## Boundary

Add a compatibility-preserving, fail-closed schema-v2 Procedure pack parser, digest, secure resolver, and exact historical version resolution.

This child follows the parent hybrid architecture: enumerated digest-bound support packs carry methodology data; versioned trusted Trellis runtime code parses, validates, reports, and enforces authority. Workers never discover pack files or execute validators.

## Predecessor

P2-01 accepted with frozen package schema, ownership map, and historical resolution contract.

The task must verify predecessor evidence directly; parent/child ordering is not dependency enforcement.

## Owned surfaces

- Exact paths frozen in the parent `research/path-ownership-map.md`.
- `packages/core/src/research/procedure-policy.ts`, `procedure-support-pack.ts`, and focused parser/digest tests.
- `packages/cli/src/commands/research/procedure-resolution.ts`, `dispatch-revalidation.ts`, and focused resolver/revalidation tests.
- Child-owned new Procedure-package filesystem/digest code-spec.
- No family methodology bodies, live registry cutover, or worker Context change.

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

## Historical revalidation integration

P2-02 changes the resolver contract from implicit current-registry lookup to an explicit selector mode:

- new activation: registry-current Procedure ID/version;
- existing activation: activation-recorded Procedure ID/version plus expected digest.

`dispatch-revalidation.ts` is within this child's ownership. It passes the recorded selector to the secure resolver, rechecks stage/kind/authority compatibility against the capability definition, and verifies the recorded digest. Callers continue consuming the same staged revalidation result. P2-03 owns later Context/Result integration but must consume this accepted behavior rather than resolving latest again.

## Compatibility

- Existing Procedure `1.0.0` bytes and schema-v1 digest behavior remain unchanged unless this task is P2-12 and the explicit cutover contract applies.
- Existing schema-v1 Research events and schema-v2 activation/approval events remain replayable.
- Existing activations resolve their recorded Procedure ID/version/digest and do not inherit newer methodology.
- Present-invalid project overrides fail closed and never fall back.
- Optional figure, slides, and survey capabilities remain explicit/non-default.

## Privacy

Only Trellis-native implementations, abstract contracts, approved evidence IDs/digests, and synthetic fixtures may be tracked. Private source bodies and raw evidence remain outside Trellis.

## Rollback

Revert only additive schema-v2 and historical-resolution support; current schema-v1 Procedures remain active and unchanged.

## Deferred risk

The Phase-1 live-trial waiver permits deterministic planning/implementation evidence only. This child must not claim live host/model equivalence.
