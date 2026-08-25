---
name: research-theory
description: Derive, formulate, prove, repair, and audit research-level mathematical claims, theorem statements, proof obligations, assumptions, counterexamples, and asymptotics. Use when mathematical validity affects a research contribution or manuscript proof. Exclude textbook exercises and routine symbolic algebra.
---

# Research Theory

Turn formula ideas, theorem drafts, and proof sketches into explicit derivations, proofs, or precise blockage reports. Try to break a claim before proving it.

## Workflow

1. **Freeze the claim.** Exact mathematical object, notation, domains, assumptions, quantifiers, limit order, and non-claims. Missing load-bearing information is a blocker; never invent assumptions.
2. **Derive stepwise.** When the formula or invariant is not fixed, derive it, distinguishing identities, theorem applications, approximations, heuristics, and conjectures. Record approximation boundaries and constant dependence.
3. **Try to break it.** Before proving or repairing: boundary and degenerate cases, toy examples, dimensional consistency, numerical or symbolic checks when feasible. Record any counterexample found or the scope actually checked.
4. **Discharge obligations.** For every nontrivial theorem or lemma applied, expose its hypotheses and where each is discharged. Separate proven facts, stated assumptions, heuristics, conjectures, and blockers.
5. **Prove, weaken, or block.** Prove the claim as stated, make the minimal explicit weakening that admits a valid proof, or stop with a precise blockage report. Never silently strengthen assumptions, narrow scope, change quantifiers, or hide conditionality.
6. **Classify.** One proof status: `provable_as_stated`, `provable_after_weakening`, `not_currently_justified`, or `blocked`. Propagate any scope change to every summary and handoff.

Complete when the claim, assumptions, and quantifiers are explicit, the break attempt is recorded, every obligation is discharged or listed open, and the proof status is assigned.

## Rules

- Durable artifacts: `note/<vault>/theory/<topic-slug>/` when the workspace has `note/<vault>/`, else `artifacts/research-theory/<topic-slug>/`; manuscript LaTeX stays in the paper repo.
- Route prior-theorem and citation work to `research-literature`, manuscript integration to `research-writing`, numerical falsification to `research-experiment`.
- When `research-quest.yaml` governs the project and durable theory artifacts changed, prepare one event, tell the user to invoke `$research-quest-admin` explicitly, then stop; this skill never writes quest state.
