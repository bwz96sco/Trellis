# C03 Replace Skill resolver with capability registry

## Goal

Replace the public core stage-to-Skill resolver with the immutable Trellis capability registry frozen by C01, while keeping active Dispatch Context and worker Skill behavior byte-compatible until C06/C07 own the execution cutover.

## Dependency and ownership

- C01 contract freeze and C02 mixed-ledger reader/reducer must already be archived and committed.
- C03 owns the core capability registry, deterministic explicit/default capability selection, Research-subpath exports, focused tests, and the smallest private CLI compatibility bridge needed to keep current Context behavior compiling unchanged.
- C04 owns Procedure and project-policy resolution.
- C05 owns activation/approval event emitters and commands.
- C06 owns `dispatch context` capability/Procedure/policy/approval cutover, `--skill-name` removal, approval consumption, and removal of the private bridge from the production Context path.
- C07 owns Claude/Codex generic worker cutover and removal of any residual bridge-backed test imports or fixtures that exist only to characterize selected-Skill worker behavior. No bridge module or consumer may remain after C07.
- C08/C09 own installed and packaged Research Skill retirement.

## Requirements

- Replace the nine broad Skill-oriented stage descriptors with the exact 14-entry immutable capability inventory frozen in C01.
- Export exact capability IDs, kinds, activation modes, definitions, registry, and default-per-stage mapping only through `@mindfoldhq/trellis-core/research`.
- Keep every registry field and value exact: stage, kind, activation, Procedure ID/version, proposal-only worker authority, network policy, Repository scope, duration/Dispatch ceilings, and ordered approval requirements.
- Keep `complete` explicitly non-dispatchable and absent from the capability registry.
- Freeze these default selections without relying on registry array order:
  - `setup` -> `research.setup.project`
  - `framing` -> `research.framing.quest`
  - `literature` -> `research.literature.scan`
  - `ideation` -> `research.ideation.generate`
  - `experiment` -> `research.experiment.round`
  - `computation` -> `research.computation.case`
  - `theory` -> `research.theory.case`
  - `audit` -> `research.audit.case`
  - `writing` -> `research.writing.case`
- Add deterministic resolution for either one explicit capability ID or the exact stage default. Unknown IDs, non-dispatchable `complete`, and stage mismatches fail closed with typed stable error codes. Resolution never auto-chains, selects a second capability, reads files, or depends on host/discovery order.
- Runtime-freeze the registry array, every definition, nested Procedure reference, approval-requirement array, and default map; TypeScript `readonly` alone is insufficient for the canonical source constant.
- Preserve exact Claude/Codex validation through `parseResearchExecutionHost`, but remove host from capability selection input/output.
- Remove public core Skill routing concepts: `OptionalResearchSkill`, `BundledResearchSkill`, discovered Skill normalization, optional/fallback fields, selected Skill, and host/bundled source selection.
- Remove old Skill-oriented exports from the Research subpath. Do not change the package export map or root barrel.
- Keep current `dispatch context <request-file> --host ... [--skill-name ...]` behavior and output unchanged during C03 through one private CLI-only compatibility resolver. It must not be package-exported, persisted, treated as canonical authority, or reused by new capability code. Current CLI tests may import its internal constants instead of removed core Skill exports. C06 removes it from the production Context path; C07 removes any residual bridge-backed worker/hook test dependency, after which the bridge module itself must be absent.
- Update packed-core and package-export assertions from the retired resolver to the successor registry API; do not change package export keys, versions, or packed CLI Skill inventory.
- Keep historical `Dispatch.ownerSkill`, `provider`, and `taskRef` parsing and round-trip behavior unchanged and non-authoritative.
- Do not add Procedure files, policy resolution, activation emitters, approval commands, Context gating, worker changes, Skill deletion, payload changes, projection changes, package-version changes, or Git history mutation.
- Preserve `.trellis/research/**`, frozen cleanup/migration evidence, `docs-site`, `marketplace`, and unrelated files.

## Public successor API

```ts
export type ResearchCapabilityId = /* exact 14-ID union */;
export type ResearchCapabilityKind = "bounded" | "workflow" | "advisory";
export type ResearchActivationMode = "automatic" | "explicit";

export interface ResearchCapabilityDefinition {
  readonly id: ResearchCapabilityId;
  readonly stage: DispatchableQuestStage;
  readonly kind: ResearchCapabilityKind;
  readonly activation: ResearchActivationMode;
  readonly procedure: Readonly<{ id: string; version: string }>;
  readonly workerAuthority: "proposal-only";
  readonly networkPolicy: "forbidden" | "declared-only";
  readonly repositoryScope: "single" | "multiple";
  readonly maxDurationMinutes: number;
  readonly maxDispatches: number;
  readonly approvalRequiredFor: readonly (
    | "workflow"
    | "network"
    | "external-cost"
    | "multiple-repositories"
    | "canonical-mutation"
    | "capability-chaining"
  )[];
}

export const RESEARCH_CAPABILITY_REGISTRY: readonly ResearchCapabilityDefinition[];
export const RESEARCH_DEFAULT_CAPABILITY_BY_STAGE:
  Readonly<Record<DispatchableQuestStage, ResearchCapabilityId>>;

export type ResearchCapabilityResolutionErrorCode =
  | "UNKNOWN_CAPABILITY"
  | "CAPABILITY_STAGE_MISMATCH"
  | "QUEST_STAGE_NOT_DISPATCHABLE";

export class ResearchCapabilityResolutionError extends Error {
  readonly code: ResearchCapabilityResolutionErrorCode;
}

export function getResearchCapabilityDefinition(
  capabilityId: string,
): ResearchCapabilityDefinition | undefined;

export function resolveResearchCapability(input: {
  readonly stage: QuestStage;
  readonly capabilityId?: string;
}): {
  readonly stage: DispatchableQuestStage;
  readonly capability: ResearchCapabilityDefinition;
  readonly selection: "explicit" | "default";
};
```

A resolution returns one frozen definition plus `selection: "explicit" | "default"`. Stage validation has precedence over capability lookup: `complete`, and any runtime stage value outside the exact nine dispatchable Quest stages, always throws `ResearchCapabilityResolutionError` with `code: "QUEST_STAGE_NOT_DISPATCHABLE"`, even when `capabilityId` is supplied. `capabilityId: undefined` selects the stage default; every supplied string, including empty or whitespace-only input, is explicit. Empty, whitespace, case-variant, adorned, or unknown explicit IDs fail with `UNKNOWN_CAPABILITY`; they never select a default. A known ID for another stage fails with `CAPABILITY_STAGE_MISMATCH`.

## Acceptance criteria

- [ ] Exact 14 capability IDs and all frozen field values are represented once, in frozen order, with no `complete` entry and no initial advisory entry.
- [ ] Exact nine-stage default map is explicit and independent of registry order.
- [ ] Explicit and default resolution is deterministic for every dispatchable stage.
- [ ] Unknown explicit capability IDs fail with `UNKNOWN_CAPABILITY`; known IDs for another stage fail with `CAPABILITY_STAGE_MISMATCH`; `complete` and runtime-invalid stage values fail with typed `QUEST_STAGE_NOT_DISPATCHABLE` before capability lookup.
- [ ] Registry array, definitions, nested Procedure refs, approval-requirement arrays, and default map are runtime-frozen.
- [ ] Resolver input/output contains no host, discovery, optional Skill, fallback Skill, selected Skill, or source concept.
- [ ] `parseResearchExecutionHost` still accepts exactly `claude` and `codex` and rejects all other values.
- [ ] Old Skill-oriented core types/functions/constants are absent from the Research subpath and root barrel remains unchanged.
- [ ] Existing Dispatch Context output, zero-write behavior, `--skill-name` compatibility, Claude/Codex parity, and current Skill selection remain unchanged through the private CLI bridge.
- [ ] Arbitrary historical `ownerSkill`, `provider`, and `taskRef` still parse and round-trip unchanged and never select a capability.
- [ ] No Procedure/policy/event/store/projection/worker/payload/cleanup/package-version behavior changes.
- [ ] Focused core and CLI compatibility tests, core/CLI lint/typecheck/build, workspace typecheck, task validation, code-spec seven-section validation, and `git diff --check` pass.
- [ ] GitNexus changed-scope review reports only predicted registry, public-subpath, private compatibility-bridge, tests, specs, and task artifacts; no unexplained execution-flow expansion.
- [ ] C03 archives and commits only after independent review passes. No push.
