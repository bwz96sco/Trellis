# Artifact, validator, report, composition, and Context contracts

## Methodology artifact contract (not silent ArtifactRef widening)

Each methodology artifact contract records:

- artifact contract ID/version
- requiredness and cardinality
- canonical path/name and media type
- producer and consumers
- dependencies
- stable entity/candidate/case IDs
- provenance requirements
- terminal-state applicability
- cross-artifact consistency rules
- validator bindings (stable validator ID/version)

## Validators

- Support packs: declarative descriptors only
- Trusted root runtime: implementations by stable ID/version
- Validation runs **before** canonical Result/Proposal/approval-consumption commit
- Critical failure ⇒ **zero** canonical writes

## Deterministic reports

Bind: Procedure id/version/digest, methodology contract version, Dispatch, Activation, Result, Proposal, artifact identities/digests, validator versions, stable error codes, terminal result.

## Root-owned bounded composition

Frozen edges only:

1. `research-experiment-campaign` → `research-experiment` (COMP-001)
2. `research-review-campaign` → `research-review-case` (COMP-002)
3. `research-slides` → `personal-slides` (COMP-003 bounded adapter; no private impl import; no canonical Research authority for personal-slides)

Descriptor binds: stable composition/edge IDs, parent Dispatch/Activation, allowed child capability or adapter, max child count / remaining Dispatch budget, root authorization evidence, Procedure/policy/request digests, non-transitive + no-worker-launch rules, failure/cancellation/rollback evidence.

Workers never launch composition or adapters.

## Context v1/v2

- v1 Context remains valid for v1 Procedures
- v2 Context may embed support-pack inventory digests when activation records v2 Procedure digest
- Worker false authority ceiling unchanged (Proposal-only)

## Select/block translation

Source select/block → worker Result + pending Proposal → root validation → root Decision. Never worker canonical mutation.
