# Quest Administration

## Purpose

Evaluate and plan an administrative change to Quest framing, scope, evidence bar, or acceptance criteria.

## Preconditions

Use a framing-stage workflow Dispatch with explicit root approval and a requested administrative change stated in supplied context.

## Inputs

Use current framing material, requested change, rationale and evidence, declared repository and artifacts, and supplied checks.

## Procedure

Compare current and requested state, identify affected assumptions, exclusions, and criteria, test internal consistency, and produce an ordered root-side change plan with rollback or deferral notes.

## Outputs

Return exactly one strict Result recording impact analysis plus one pending Proposal describing only supported canonical changes for root review.

## Checks and Stop Conditions

Stop on unstated scope expansion, missing rationale, contradictory criteria, unsupported lifecycle transition, or undeclared reads or writes.

## Authority Boundaries

Workflow classification grants no mutation authority. Do not change Quest state, launch follow-up Dispatches, apply a Proposal, commit Git history, or expand scope.
