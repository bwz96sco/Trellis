# G1 — Core v1.3.1 closure correction authorization design

## Boundary

G1 is a standalone governance-only overlay. It does not modify Core or T2. Its `task.json` is the sole normative prospective authority; the remaining standard files document the boundary and checks.

```text
committed G0 route rule + completed defective T1
  -> standalone G1 governance task
  -> separate G1 commit
  -> separate T1C task and LOW-risk Core correction commit
  -> resume existing preserved T2 work
```

## Topology and actor separation

G1 remains outside the existing campaign tree:

- `parent: null`
- `children: []`
- no ninth campaign child
- governance actor: `claude-core-correction-governance-author`
- technical actor: `claude-t1-core-correction-implementer`

The technical actor must work under the separate `.trellis/tasks/08-13-correct-core-v131-closure-families` boundary only after the G1 commit exists.

## Source and defect routing

The route source is immutable commit `b7c3c6645afb2d34c14548069bbaba61d060d5ee`. Its governing rule is exact: `T1-core-defect: return to T1; later stages cannot repair Core`.

The defective predecessor is completed T1 commit `05573ab1a37af3de66bfc6a797b1e35ba3c47cf3`. G1 creates a forward-only correction and does not amend that completed task or its evidence.

## Exact technical correction

The accepted v1.3.1 closure contract permits exactly:

```text
research-literature
research-ideation
research-idea-evaluation
research-experiment
```

The current Core constant substitutes `research-quest` and `research-computation` for the two ideation families. The future correction changes only the accepted family set used by `buildMethodologyReportV131`; it adds focused positive and negative regression coverage in `methodology-runtime.test.ts`.

The exact technical commit inventory is the separate task's six standard files plus the one production file and one focused test file. No Core spec path is included because the current specs do not state the defective list. A discovered spec contradiction is a stop condition, not implicit scope expansion.

## Impact gate

The latest fresh impact result is LOW with two direct dependents, two impacted symbols, and zero processes. Because the governance commit changes the repository state, the technical implementer must confirm fresh upstream impact before editing. A HIGH or CRITICAL result requires another explicit approval.

## Compatibility and return route

The correction must not alter historical v1.3.0 replay, accepted v1.3.1 identity or digest, report-v2 schema/digest behavior, live Procedure `1.0.0`, dormant Procedure `2.0.7`, or Proposal-only worker authority.

Existing T2 work remains uncommitted, byte-preserved, and blocked through the G1 and T1C commits. After the Core correction commit, T2 resumes under its existing authority; G1 does not widen T2 or grant T3–T7 authority.

## Commit separation

The sequence has two authenticated commit boundaries:

1. G1 commit: exactly this task's six standard files; staged GitNexus change detection must show no production impact.
2. T1C commit: exactly the separate technical task's six standard files plus the production and focused test paths; tests and refreshed impact must pass.

This authoring run stops before staging either boundary.
