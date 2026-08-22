# C2 Execution-Package Design

## Architecture

```text
Procedure v1/v2 parser adapter ----+
                                    |
Skill v3 parser adapter ------------+--> normalized execution-package identity
                                    |
project/bundled secure resolver ----+
                                    |
                                    +--> C3 lightweight inspection/context
                                    +--> C5 managed lifecycle/context
```

One package-neutral layer owns identity and selection. Historical Procedure APIs remain compatibility wrappers. Capability registry remains managed authority; it is not a package store and is not rebound in C2.

## Skill Manifest V3

```ts
interface ResearchSkillManifestV3 {
  schemaVersion: 3;
  packageKind: "skill";
  id: string;
  version: string;
  skillKind: "bounded" | "workflow" | "advisory" | "admin";
  invocationSource: "model" | "operator-explicit";
  entrypointType: "model-context" | "root-command";
  instructionFile: "SKILL.md";
  allowedProfiles: Array<"lightweight" | "managed">;
  managedBinding?: { capabilityId: string };
  members: ResearchSkillMemberV3[];
  outputs?: {
    primary: string[];
    defaultPersistence: "ephemeral" | "request-dependent" | "durable-required";
  };
  handoff?: {
    suggestedSkillIds: string[];
    autoInvoke: false;
  };
}

interface ResearchSkillMemberV3 {
  path: string;
  role: "reference" | "template" | "validator" | "helper";
  load: "default" | "on-demand";
  visibility: "worker-visible" | "root-only";
  sha256: string;
  maxBytes: number;
}
```

The serializer fixes key order and emits one final LF. Set-like arrays and members use deterministic order. Parsing rejects any alternate byte representation.

`model-context` requires nonempty profiles. `managedBinding` is present iff managed is allowed and references an existing capability. `root-command` requires `operator-explicit`, empty profiles, no binding, and no worker-visible members.

Members are strict UTF-8, non-NUL, digest-bound regular files. Paths are forward-slash relative, contained, unique, and cannot name `skill.json` or `SKILL.md`. Limits: 64 KiB manifest, 256 KiB instructions, 256 members, 1 MiB/member, 8 MiB aggregate.

## Identity and Digests

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

New digests use `uint64-big-endian(length) || bytes` framing.

- Instruction domain: `trellis-research-execution-package-instruction-v1\0`.
- Inventory domain: `trellis-research-execution-package-member-inventory-v1\0` plus adapter tag and canonical inventory.
- Skill package domain: `trellis-research-execution-package-digest-v3\0` plus manifest, instructions, inventory, paths, and member bytes.

Procedure v1/v2 `packageDigest` remains the current digest. Procedure instruction digest uses original authenticated `PROCEDURE.md` bytes. Procedure-v1 inventory is `[]\n`; Procedure-v2 inventory uses existing support-pack inventory serialization.

## Parser Boundary

New Core package-neutral APIs parse authenticated bytes and perform no filesystem discovery:

```ts
parseResearchSkillExecutionPackage(...)
computeResearchExecutionPackageInstructionDigest(...)
computeResearchExecutionPackageMemberInventoryDigest(...)
computeResearchSkillPackageDigest(...)
normalizeResearchProcedureExecutionPackageIdentity(...)
validateResearchSkillInvocation(...)
assertResearchExecutionPackageIdentity(...)
```

`ParsedResearchProcedure` remains compatible and gains normalized identity additively. Existing Procedure digest and serializer functions stay unchanged.

## Resolver Boundary

```ts
type ResearchExecutionPackageSelector =
  | { packageKind: "procedure"; mode: "registry-current"; capabilityId: string }
  | {
      packageKind: "procedure";
      mode: "activation-recorded";
      capabilityId: string;
      id: string;
      version: string;
    }
  | { packageKind: "skill"; mode: "exact"; id: string; version: string };
```

`resolveResearchExecutionPackage` is the shared boundary. `resolveResearchSkillExecutionPackage` is a typed convenience wrapper, not a second authority. Existing `resolveResearchProcedure` delegates through the shared boundary and preserves its contract.

Resolution order:

1. inspect exact project package;
2. present valid project package wins;
3. present invalid project package fails;
4. only absent project path permits bundled lookup;
5. absent in both returns stable not-found error.

Skills resolve from `.trellis/research/skills/<id>/<version>` and bundled `templates/research/skills/<id>/<version>`. The selected source is runtime metadata, not persisted identity.

Full inventory authentication precedes audience filtering. Worker selection includes default worker-visible and requested on-demand worker-visible members. Root may request root-only members. Forbidden requests fail the entire resolution.

## Activation and Approval Compatibility

Historical event schema v2 remains closed and unchanged. Add a new event-schema branch for execution-package records:

```ts
type ResearchActivation =
  | LegacyProcedureActivation
  | ExecutionPackageActivation;

type ResearchApprovalGrant =
  | LegacyProcedureApprovalGrant
  | ExecutionPackageApprovalGrant;
```

Legacy records require `procedure`/`procedureDigest`. New records require `executionPackage`/`executionPackageDigest`. Opposite fields are forbidden. Shared helpers return binding digest and clone normalized identity for reducer/store logic.

C2 supports canonical parse/reduce/store for these records but does not create a live CLI Skill Activation. C5 later binds live resolution and approved Context to this representation.

## Error Model

Keep all Procedure errors unchanged. Add stable Skill/package errors for invalid manifest, instructions, member, project package, bundled package, not found, invocation forbidden, member forbidden, and identity mismatch. Public stable messages must not expose absolute package paths; causes retain internal detail.

## Packaging

`copy-templates.js` already recursively copies future Skill package roots; do not add a copy mechanism. Update packed audit to require retained Procedure versions through 2.0.7 and manifest-declared package members. C2 uses only test fixtures; C6 adds production Skill packages.

## Rollback

No canonical migration or live cutover occurs. Compatibility wrappers provide rollback seams: remove schema-v3 parsing/resolution and new event support while restoring the unchanged Procedure resolver. Historical ledgers, Procedure packages, capability bindings, and policies remain untouched.
