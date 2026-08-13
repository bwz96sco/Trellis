# Core v1.3.1 closure family validation correction design

## Boundary

This is a forward-only correction under governance commit `29ff0837caf68edfd89dbfa3771f959eb4dcf313`. It does not amend the completed T1 implementation or widen T2.

The production boundary is the existing `V131_CLOSURE_FAMILIES` membership check used by `buildMethodologyReportV131` while validating `closureSources` rows. No schema, public signature, digest framing, report property, serializer, or runtime authority changes.

## Correction

Replace the two incorrect accepted entries:

```text
research-quest       -> research-ideation
research-computation -> research-idea-evaluation
```

The resulting ordered set is exactly:

```text
research-literature
research-ideation
research-idea-evaluation
research-experiment
```

## Test design

Use the existing `baseInput` for the v1.3.1 closed report-v2 tests and construct one valid closure row at a time. Positive cases call `buildMethodologyReportV131` with each newly restored family and assert the returned `closureSources` row exactly. Negative cases call the same public builder with each removed family and assert rejection.

This exercises the production membership branch directly without duplicating the constant or changing report-v2 fixtures.

## Compatibility

The correction is isolated to v1.3.1 nested report validation. It leaves historical v1.3.0 report construction and serialization, canonical JSON, digest domains, accepted v1.3.1 identity/digest, Procedure parsing, validator triples, zero-write dispositions, and worker authority unchanged.

## Stop conditions

Stop rather than widen scope if the correction requires another Core path, a spec edit, completed T1 artifact changes, T2 changes, or any operational authority.
