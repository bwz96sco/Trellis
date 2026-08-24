# Integrate Managed Research Skill Execution

## Goal

Make schema-v3 thin Research Skills executable through Trellis's existing managed Dispatch lifecycle while preserving one immutable execution-package identity across lightweight and managed profiles.

User value: operators can run durable, isolated, reviewable Skill work without restoring giant Procedure packs or creating a second execution system. Exact Skill bytes, approved members, Workflow node, capability, Approval, Result, and Proposal remain replayable and root-authorized.

## Background

- C2 added schema-v3 Skill packages, normalized Procedure/Skill identity, secure project-first resolution, and additive execution-package Activation/Approval records. Live Dispatch and Context deliberately reject those records until C5.
- C3 added immutable DAG Workflow definitions and canonical bind/complete/transition/close state. Workflow nodes already carry exact normalized execution-package identity and allow `lightweight`, `managed`, or both.
- C4/C4b added scientific gates and Quest writer authority. H1/H2 remain separate from operational Approval and never invoke work.
- Existing managed Procedure execution already provides Dispatch, Activation, Approval, approved Context, Claude/Codex worker boundary, atomic Result plus pending Proposal recording, Proposal Decision, and consumed Approval recovery.
- C5 generalizes that one lifecycle. It does not add a Skill registry, alternate replay path, hidden provider call, or automatic Workflow continuation.

## Requirements

### R1 — One package identity and one lifecycle

- Managed Skill execution must use `ResolvedExecutionPackageIdentity` from C2 without translating `SKILL.md` into a fabricated Procedure.
- Lightweight and managed resolution of the same Skill ID/version must produce identical package, instruction, and member-inventory digests and identical instruction bytes.
- Existing Procedure schema-v1/v2 package digests, Activation/Approval payloads, Context schema-v1/v2, recorded resolution, and Result/Proposal behavior remain unchanged.
- A present invalid project Skill blocks bundled fallback. Package, instruction, inventory, or member drift fails before Approval Context or worker launch.

### R2 — Explicit managed package selection

Extend the existing deterministic Dispatch prepare path; do not add a second Skill-specific lifecycle command.

```text
trellis research dispatch prepare ...
  [--skill <id> --skill-version <version>]
  [--member <path>...]
  [--workflow-instance <id> --workflow-node <node>]
```

Rules:

- absent Skill options preserve historical Procedure selection exactly;
- `--skill` and `--skill-version` are an exact pair;
- `--member` is valid only with an exact Skill selection and persists the normalized approved-member request;
- Workflow instance/node options are an exact pair and require the active current node;
- when Workflow-bound, resolved Skill identity must equal the node's exact execution-package identity, the node must allow `managed`, and the instance Quest must equal the Dispatch Quest;
- the Skill manifest must use `entrypointType: "model-context"`, allow `managed`, and bind the selected existing capability;
- `operator-explicit` is satisfied only by this exact explicit package selection and, when Workflow-bound, exact current-node binding. Capability registry fallback, `ownerSkill`, `provider`, or `taskRef` never proves selection authority;
- `root-command` packages never enter Dispatch or worker Context.

### R3 — Durable managed binding

- New execution-package Activations persist a closed managed binding beside the full normalized identity.
- Binding contains normalized unique requested member paths and optional exact Workflow instance/current-node identity.
- Workflow binding freezes instance ID, Workflow ID/version/digest, and node ID. Context rereads canonical Workflow state and requires the same active current node before launch.
- Requested member selection must be replayable from canonical Activation state. A digest of the full inventory alone is insufficient because it does not identify the approved subset.
- Activation operational mode (`automatic` or `explicit`) remains capability/policy authority and is not reused as package invocation-source proof.

### R4 — Package-neutral capability and policy authority

- Reuse existing capability registry, project policy, Repository scope, Dispatch request digest, scope hash, duration/dispatch limits, network/cost constraints, and proposal-only ceiling.
- Generalize effective authority so its immutable package binding may be a historical Procedure or normalized Skill identity. Do not create a second policy model.
- Skill `managedBinding.capabilityId` must equal the selected capability. Capability stage and project-policy checks remain mandatory.
- Existing automatic Approval eligibility remains conservative. An `operator-explicit` Skill or Workflow-bound managed execution cannot gain automatic selection authority from package prose.
- Approval grant binds the execution-package digest for new Activations; historical grants continue binding `procedureDigest`.

### R5 — Approved Context schema-v3

Add a new managed worker input variant while preserving historical Context schema-v1/v2 exactly.

The schema-v3 Context must include:

- existing Dispatch, capability, Repository, Artifact, write-path, expected-output, checks, authority ceiling, and derived output IDs;
- execution-package Activation/Approval binding digests;
- exact normalized Skill identity;
- `executionProfile: "managed"`;
- manifest invocation source and `entrypointType: "model-context"`;
- exact `SKILL.md` instructions;
- only normalized requested, manifest-declared, worker-visible members with path, role, digest, and content;
- optional exact Workflow binding copied from and revalidated against canonical Activation/Workflow state.

Context rules:

- authenticate the full package inventory before projecting any subset;
- no root-only, undeclared, unrequested, escaping, drifted, or ambient-source member bytes;
- host adapters/workers never discover package roots, versions, manifests, or source repositories;
- Claude and Codex receive equivalent normalized payloads; host changes launch mechanics only;
- Context remains read-only and launches no worker by itself.

### R6 — Revalidation and Approval compatibility

- Generalize staged activation revalidation, approval selection, approval grant creation, materialization, and approved-result preflight through package-neutral binding helpers.
- Preserve established failure ordering: canonical Dispatch/materialization/hierarchy, capability/policy, package identity, request digest, scope hash, Approval relation/status/host/expiry, then output-ID availability.
- Execution-package Activation and Approval variants must match each other exactly. Mixed legacy/new bindings fail closed.
- Approval revocation, expiry, consumption, same-host uniqueness, and recovery behavior remain unchanged.

### R7 — Result and Proposal remain root-owned

- Reuse `recordApprovedResearchDispatchResult`, existing strict Result/Proposal input, atomic `result.record + proposal.record + approval.consume`, same-key replay, projection repair, and Proposal apply/reject paths.
- Remove only the Procedure-only guard that blocks valid execution-package Activations; do not weaken methodology-specific validation for historical Procedure versions.
- Worker remains proposal-only. Package instructions cannot record canonical state, apply Proposal operations, complete Workflow nodes, record H1/H2, select transitions, launch another Skill/Procedure/Workflow/capability/Dispatch, or create nested agents.
- Result/Proposal recording alone leaves Workflow state byte-identical.

### R8 — Explicit managed Workflow completion

- Keep `trellis research workflow complete` command signature unchanged.
- If accepted refs contain no Result, completion remains `lightweight` and preserves current behavior.
- If accepted refs contain a Result, root derives the associated Dispatch, Activation, accepted Result/consumed Approval relation, and exact execution package; completion is `managed` only when that identity equals the active node identity and any frozen Activation Workflow binding equals the current instance/node.
- Managed completion accepts the Result plus optional accepted Artifacts from that accepted work. Conflicting/multiple managed identities fail closed.
- Core node-complete mutation receives the resolved execution profile and validates the node permits it.
- Completion remains a separate root mutation after Result recording. Transition remains another separately operator-selected mutation. Neither action invokes a model or next node.

### R9 — Host and packaging parity

- Generated Claude and Codex worker contracts consume schema-v3 Context without changing authority or output IDs.
- Workers must reject/ignore nested-execution instructions and return bounded Result/Proposal output only.
- Packed CLI audit must continue deriving required inventory from extracted manifests and include every declared Skill member when C6 later adds production packages.
- C5 may use test-only Skill fixtures. It must not ship or migrate real pilot Skills.

### R10 — Compatibility and zero-execution boundary

- Historical Procedure `1.0.0` and recorded dormant `2.0.7` Activations remain replayable without byte rewriting or live registry rebinding.
- Existing Procedure-only commands and outputs remain compatible when Skill selection options are absent.
- Lightweight Skill context remains provider-free and creates no Dispatch/Activation/Approval/Result/Proposal state.
- C5 commands may prepare, approve, validate Context, and record supplied worker output in tests; implementation must not invoke a real provider or managed worker.
- No automatic continuation, slash wrapper, host-native Skill discovery, source-repository modification, C6 package migration, C7 evaluation, push, release, publication, or activation.

## Acceptance Criteria

- [ ] Lightweight and managed resolution of one test Skill produce identical normalized identity, exact instruction bytes, package digest, instruction digest, and member-inventory digest.
- [ ] Existing Dispatch prepare behavior and historical Procedure Activation/Approval/Context schema-v1/v2 output are unchanged when Skill options are absent.
- [ ] Exact Skill selection persists one execution-package Activation with normalized approved-member paths and optional exact Workflow instance/node binding.
- [ ] Capability, profile, entrypoint, package identity, member selection, Workflow instance/current node, Quest, request digest, policy digest, scope hash, and Approval mismatches fail before worker launch.
- [ ] Managed Context exposes exact `SKILL.md` plus only approved worker-visible members; root-only, undeclared, unrequested, escaping, and drifted members produce no partial Context.
- [ ] `operator-explicit` Skills require exact explicit selection; `root-command` Skills cannot enter managed Context.
- [ ] New Approval grants bind `executionPackageDigest`; mixed legacy/new Activation/Approval relations fail closed.
- [ ] Existing Approval authority, host, expiry, revocation, uniqueness, consumption, and recovery checks remain active.
- [ ] Valid schema-v3 Result/Proposal recording remains atomic with Approval consumption and leaves Workflow current node unchanged.
- [ ] Worker authority remains proposal-only and forbids nested Skill, Procedure, Workflow, capability, Dispatch, provider, or agent execution.
- [ ] Explicit Workflow completion derives `managed` from accepted canonical Result evidence, verifies exact node/package/binding identity, and does not select or execute a transition.
- [ ] Result recording, node completion, and transition remain three separate root actions.
- [ ] Claude and Codex Context payloads are equivalent apart from host field/launch mechanics and preserve identical authority and output IDs.
- [ ] Historical Procedure `1.0.0` and recorded dormant `2.0.7` replay remain valid; methodology-specific Procedure validation is not weakened.
- [ ] Packed-tarball inventory audit remains manifest-derived and ready for future schema-v3 package members without shipping a production Skill in C5.
- [ ] Focused Core/CLI tests, historical regressions, C3/C4/C4b regressions, full Core/CLI suites, typecheck, lint, build, package audit, task validation, and diff checks pass.
- [ ] No provider/worker invocation, C6/C7 work, external source change, push, release, publication, slash wrapper, or automatic continuation occurs.

## Out of Scope

- Authoring or migrating the five real pilot Skills (C6).
- Running A/B/C provider/model evaluation (C7).
- Changing Skill methodology, scientific truth, H1/H2 semantics, or Quest writer authority.
- Adding a second Skill registry, replay system, Approval type, Result type, or worker implementation.
- Rebinding live capability defaults to a production Skill.
- Automatic Workflow transition, node chaining, cycles, retries, or step-budget engines.
- Host-native Skill discovery or generated slash wrappers.
- Real provider calls, managed worker launch, push, release, publication, or production activation.
- Changes to `agent-skills-private`.

## Blocking Questions

None. Parent architecture, C2 normalized identity, C3 Workflow state, C4/C4b authority boundaries, and current explicit C5 goal determine product behavior. Implementation must stop rather than invent a new authority concept if existing package-neutral bindings cannot express the contract.
