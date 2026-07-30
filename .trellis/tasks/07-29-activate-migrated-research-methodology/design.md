# P2-12 design — Activate migrated Research methodology atomically

## Boundary

Perform the sole reviewed registry/version and package-inventory cutover after every dormant family and frozen differential slice passes.

This child follows the parent hybrid architecture: enumerated digest-bound support packs carry methodology data; versioned trusted Trellis runtime code parses, validates, reports, and enforces authority. Workers never discover pack files or execute validators.

## Predecessor

P2-06 through P2-11 accepted; all dormant packs, family reports, composition reports, and rollback evidence frozen.

The task must verify predecessor evidence directly; parent/child ordering is not dependency enforcement.

## Owned surfaces

- `stage-capabilities.ts` current version bindings and optional capability registrations.
- Central live Procedure inventory/indexes, packed required-path audits, and integration cutover tests/spec consolidation.
- No family methodology body edits except integration fixes routed back to the owning child.

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

The cutover is specified by a canonical `research/cutover-manifest.json` whose digest binds capability ID, stage route, automatic/explicit/default status, Procedure ID/version/digest, validator binding, packed path, previous binding, cutover state, and rollback target. Integrated coverage maintains independent frozen-229 and expansion-38 registries; composition and control cases are not recounted.

## Compatibility

- Existing Procedure `1.0.0` bytes and schema-v1 digest behavior remain unchanged unless this task is P2-12 and the explicit cutover contract applies.
- Existing schema-v1 Research events and schema-v2 activation/approval events remain replayable.
- Existing activations resolve their recorded Procedure ID/version/digest and do not inherit newer methodology.
- Present-invalid project overrides fail closed and never fall back.
- Optional figure, slides, and survey capabilities remain explicit/non-default.
- Frozen v1.2 requires `research.literature.review` as the literature automatic/default route and `research.literature.scan` as non-default; unrelated routes remain unchanged unless a separately reviewed v1.3+ contract supersedes v1.2.

## Privacy

Only Trellis-native implementations, abstract contracts, approved evidence IDs/digests, and synthetic fixtures may be tracked. Private source bodies and raw evidence remain outside Trellis.

## Rollback

Before any new activation exists, atomically restore the previous registry, inventory, and routing bindings recorded in the cutover manifest. After a new activation exists, a reviewed registry rollback may change future selection only while historical activations retain their recorded ID/version/digest; alternatively issue a forward-fix version. Do not claim a nonexistent canonical version-disable event, and never delete or reinterpret activated bytes.

## Deferred risk

The Phase-1 live-trial waiver permits deterministic planning/implementation evidence only. This child must not claim live host/model equivalence.
