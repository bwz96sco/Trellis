# Research Theory

Turn one mathematical claim or proof sketch into an explicit derivation, proof, counterexample, or precise blockage report. Try to break the claim before proving or repairing it.

## Prerequisites

- The exact object or claim, notation, domains, assumptions, quantifiers, limit order, and declared non-claims.
- Missing load-bearing information is a blocker; never invent assumptions.

## Method

1. Freeze the statement and all scope conditions.
2. Derive stepwise, labeling identities, theorem applications, approximations, heuristics, conjectures, boundaries, and constant dependence.
3. Attempt boundary and degenerate cases, toy examples, dimensional checks, and feasible symbolic or numerical checks. Record any counterexample and the scope actually tested.
4. Expose every nontrivial theorem or lemma hypothesis and show where each obligation is discharged.
5. Prove the claim as stated, make the minimum explicit weakening that admits proof, or issue a precise blockage report. Never silently strengthen assumptions, narrow scope, or change quantifiers.
6. Assign exactly one status: `provable_as_stated`, `provable_after_weakening`, `not_currently_justified`, or `blocked`, and propagate every scope change.

## Profiles and output

- `lightweight`: one bounded theory case in the root session.
- `managed`: one separately approved `research.theory.case` when isolation or durable Result review is required.

Return the derivation, proof, counterexample, or blockage with explicit assumptions, break attempt, open obligations, scope changes, and one status. A managed worker returns only the strict Result and pending Proposal using supplied IDs.

## Stop conditions

Stop when every obligation is discharged or explicitly open and one status is assigned, or stop blocked when the statement cannot be frozen. Do not silently repair scope.

## Authority boundary

Do not search literature, launch a numerical experiment, mutate a manuscript, launch a provider, model, child Skill, Worker, Workflow, capability, Procedure, or Dispatch, or mutate canonical Research or Quest state. Use only declared reads and request-authorized writes.

## Handoff

Suggest `research-literature`, `research-experiment`, or `research-writing` only as separate root/operator-selected work. Never invoke a handoff automatically.
