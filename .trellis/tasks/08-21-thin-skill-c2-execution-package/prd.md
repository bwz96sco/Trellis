# Generalize Research Execution-Package Identity

## Goal

Add one Trellis-owned immutable execution-package model for historical Procedure packages and new thin Research Skills. Preserve existing Procedure bytes, digests, authority, and recorded replay while giving C3 and C5 one normalized Skill identity to consume.

## Background

C1 froze the source baseline and executable cross-layer contract. Current runtime supports only Procedure package schemas v1/v2 and stores Procedure-specific Activation/Approval bindings. C2 adds package schema v3 without creating a second Skill registry, resolver, or replay path.

## Requirements

### R1 — One normalized identity

Every resolved Procedure v1/v2 and Skill v3 package must expose:

```ts
interface ResolvedExecutionPackageIdentity {
  id: string;
  version: string;
  schemaVersion: number;
  packageKind: "procedure" | "skill";
  packageDigest: `sha256:${string}`;
  instructionDigest: `sha256:${string}`;
  memberInventoryDigest: `sha256:${string}`;
}
```

Historical Procedure `packageDigest` values and `activation-recorded` interpretation must remain unchanged.

### R2 — Closed Skill package schema v3

A Skill package consists of canonical `skill.json`, exact `SKILL.md`, and declared members. The manifest must validate exact identity, policy, member role/load/visibility, digest, size, optional output metadata, and non-automatic handoff metadata. Unknown fields, unsafe paths, invalid combinations, and noncanonical bytes fail closed.

`invocationSource`, `entrypointType`, and `allowedProfiles` are independent:

- `model-context` requires at least one declared profile;
- `managed` requires one existing capability binding;
- `root-command` requires `operator-explicit`, no model profile, and no worker-visible member;
- `operator-explicit` controls selection, not eligibility for managed model execution after explicit binding.

### R3 — Exact digest binding

Digests must bind exact validated bytes without line-ending or final-newline normalization. Skill identity must bind canonical manifest bytes, exact instructions, full canonical inventory, exact member paths, and exact member bytes. Procedure normalization must derive instruction and inventory digests without changing historical package-digest algorithms.

### R4 — One secure resolver

Generalize the existing project-first Procedure resolver into one execution-package resolver. Reuse existing path-containment, symlink, non-regular-file, stable-read, and replacement-detection behavior. A present invalid project package blocks bundled fallback. Project-only Skills are allowed. No host Skill discovery, source-repository fallback, alias, latest-version selection, or case folding is allowed.

The existing `resolveResearchProcedure(...)` API and error behavior remain compatible.

### R5 — Member projection

The resolver authenticates the full declared member inventory before exposing any subset. Default and explicitly requested on-demand members are selected by audience. Root-only or undeclared worker requests fail atomically; no partial result is returned.

### R6 — Additive managed identity records

Add a new execution-package Activation/Approval event representation while preserving historical schema-v2 Procedure events unchanged:

- legacy Activation uses `procedure`; new Activation uses `executionPackage`;
- legacy Approval uses `procedureDigest`; new Approval uses `executionPackageDigest`;
- readers and reducers normalize both forms without rewriting history;
- C2 supports parse/reduce/store tests only. C5 owns live selection, Dispatch, Approval issuance, Context, and worker execution.

### R7 — Packaging and public API compatibility

Export new Core APIs only through `@mindfoldhq/trellis-core/research`. Keep root exports and package export keys unchanged. Packed CLI audit must cover retained Procedure versions through `2.0.7` and every declared support-pack member, and be ready to validate future bundled Skill manifests without shipping pilot packages in C2.

## Acceptance Criteria

- [ ] Valid Skill v3 bytes parse into the exact normalized identity and deeply frozen package result.
- [ ] Fixed independent vectors cover package, instruction, and member-inventory digests.
- [ ] Procedure v1/v2 normalized identities retain existing package digests and exact replay behavior.
- [ ] Procedure `1.0.0` and recorded `2.0.0`–`2.0.7` compatibility tests pass.
- [ ] Project-first selection, invalid-project fail-closed behavior, symlink/containment checks, and stable-read checks apply to Skills.
- [ ] Duplicate, absolute, escaping, undeclared, digest-mismatched, oversized, wrong-visibility, and forbidden member requests fail closed.
- [ ] On-demand members are omitted unless explicitly requested.
- [ ] Model selection rejects `operator-explicit`; model Context rejects `root-command`; unsupported profiles and missing managed bindings fail.
- [ ] Lightweight and managed selection of the same Skill ID/version expose identical instructions and all three identity digests.
- [ ] New Activation/Approval records bind normalized execution-package identity; historical events parse and reduce unchanged.
- [ ] No second Skill registry/resolver/replay path, live capability cutover, canonical migration, CLI Skill command, worker launch, or pilot package is introduced.
- [ ] Core/CLI focused and full suites, typecheck, lint, build, package exports, real packed audit, task validation, diff checks, GitNexus change detection, and normal commit hooks pass.

## Out of Scope

- C3 Workflow DAG/state and `research skill` read-only commands.
- C4 H1/H2 gates and Quest import/export/writer transfer.
- C5 live managed Dispatch/Activation/Approval/Context/worker integration.
- C6 five real pilot packages.
- C7 provider/model evaluation.
- Source Skill repository edits, T6/T7 assurance, push, release, publication, or runtime Activation.
