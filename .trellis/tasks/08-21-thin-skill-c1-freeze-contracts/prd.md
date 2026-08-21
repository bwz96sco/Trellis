# C1 — Freeze Thin-Skill Contracts and Source Baseline

## Goal

Create the immutable, reviewable input boundary required by later thin-skill implementation. Freeze exact source bytes and cross-layer contracts before editing Research runtime code.

This child performs contract and evidence work only. It must not add package resolution, workflow execution, Quest mutation, managed Dispatch behavior, or migrated runtime skills.

## Dependency and Blocked Work

- Parent: `.trellis/tasks/08-21-plan-thin-skill-research-orchestration`.
- This child must complete before C2–C6 implementation.
- C7 evaluation requires all implementation children and is not authorized by completing C1.

## Requirements

### R1. Reproducible source baseline

- Freeze the approved pilot inputs from `/Users/zhangbowen/Projects/agent-skills-private`.
- Because the source working tree is not clean, use an explicit authenticated snapshot rather than treating ambient source bytes as a commit.
- Record source repository path, branch, base commit, relevant dirty/untracked state, exact included paths, exact excluded relevant-looking paths, file modes, sizes, and SHA-256 digests.
- Preserve the included source bytes under this task's `research/` directory so later children never read mutable ambient source files.
- Include only direct pilot instructions, host projections, references, templates, helpers, and validators required by:
  - `research-literature`;
  - `research-ideation`;
  - `research-idea-evaluation`;
  - `research-quest`;
  - `research-quest-admin`;
  - shared H1/H2 validation.
- Exclude unrelated host-link, README, registry-wide, external-specialist, and non-pilot changes.

### R2. One execution-package identity contract

- Define one normalized execution-package identity shared by historical Procedure packages and new thin skills.
- Historical Procedure schema v1/v2 and recorded Activation interpretation must remain unchanged.
- New thin-skill schema must define immutable ID, version, schema version, package digest, instruction digest, and member-inventory digest.
- Decide in C1 whether new Activation events require an additive normalized `executionPackage` identity field. C5 must not reopen this decision.
- A second independently replayed Skill registry is forbidden.

### R3. Separate invocation concepts

Freeze distinct machine-readable contracts for:

```text
invocationSource: model | operator-explicit
entrypointType: model-context | root-command
executionProfile: lightweight | managed
```

`research-quest-admin` must be `operator-explicit + root-command`; no model execution profile applies.

### R4. Workflow-instance contract

- Freeze versioned DAG schema requirements.
- Freeze canonical `workflow.bind`, `workflow.node.complete`, `workflow.transition.record`, and `workflow.close` event payloads.
- Bind exact workflow ID/version/digest, workflow instance, Quest, current node, execution package, accepted refs, operator transition, and gate refs.
- Allow at most one active workflow instance per Quest in the pilot.
- One node completes per invocation; no cycle, automatic continuation, or step-budget engine.

### R5. Scientific gate contract

- Freeze canonical H1/H2 gate event payload and validation matrix.
- Keep scientific gates distinct from operational Approval.
- Preserve operator wording, actor, rationale, approved/rejected refs, evidence refs, and workflow-instance/node binding.
- Gate recording must not select or execute a transition.
- Scientific Markdown files are evidence or compatibility projections, not duplicate canonical decisions after cutover.

### R6. Quest import/export and authority contract

- Freeze explicit mapping for every supported source Quest field.
- Define blocking behavior for unknown stage/status, missing owner, conflicting active owner, malformed reviewed event, escaping path, and unsupported authoritative type.
- Preserve unknown non-authoritative extensions under a namespaced compatibility field.
- Define source-compatible export reconstruction and loss reporting.
- Define committed Trellis authority projection consumed by the real source admin.
- Source `research_quest_admin.py` mutating operations must refuse before filesystem mutation when Trellis owns authority.

### R7. Executable code-spec depth

Update relevant Research code-specs with all seven sections:

1. Scope / Trigger
2. Signatures
3. Contracts
4. Validation & Error Matrix
5. Good/Base/Bad Cases
6. Tests Required
7. Wrong vs Correct

## Out of Scope

- Product TypeScript/Python implementation.
- Runtime package installation or selection.
- Workflow state writes.
- Quest import execution or authority transfer.
- Source-skill runtime migration.
- Provider/model calls.
- Procedure 2.0.7 activation.
- Push, publication, release, or T6/T7 work.

## Acceptance Criteria

- [ ] Source baseline is self-contained, byte-reproducible, and limited to exact pilot dependencies.
- [ ] Manifest authenticates source branch/base commit, relevant worktree state, path inventory, modes, sizes, and digests.
- [ ] Later children can consume baseline bytes without reading the mutable source worktree.
- [ ] Historical Procedure schema v1/v2 replay contract is preserved.
- [ ] One normalized execution-package identity and any additive Activation field are fully specified.
- [ ] Invocation source, entrypoint type, and execution profile are separate.
- [ ] DAG workflow-instance events and one-node stop semantics are executable contracts.
- [ ] H1/H2 event semantics remain separate from Approval and transition execution.
- [ ] Every Quest source field has a canonical target, blocking rule, or namespaced preservation rule.
- [ ] Source-admin refusal is specified as a pre-write filesystem-stability contract.
- [ ] Relevant code-specs contain signatures, matrices, cases, tests, and wrong/correct examples.
- [ ] Task/context validation and `git diff --check` pass.
- [ ] No product code or source repository file is modified.
