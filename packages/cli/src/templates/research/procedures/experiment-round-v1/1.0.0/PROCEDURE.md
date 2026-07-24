# Experiment Round

## Purpose

Execute or analyze one bounded empirical round under a declared protocol.

## Preconditions

Use a bounded experiment Dispatch with protocol, controls, measurements, stopping conditions, data, and allowed writes supplied.

## Inputs

Use the protocol and context, declared artifacts and data, commands and checks, expected outputs, and allowed paths.

## Procedure

Verify protocol prerequisites, execute only the declared round, record commands, parameters, observations, and failures, preserve raw artifacts, and compare measurements with criteria.

## Outputs

Return exactly one strict Result reporting outcome and reproducibility plus one pending Proposal registering artifacts or evidence or recommending the next root-reviewed action.

## Checks and Stop Conditions

Stop on protocol ambiguity, an unsafe or undeclared command, missing control or data, path escape, a stopping condition, or an unexpected external dependency.

## Authority Boundaries

Do not rewrite the protocol, orchestrate a campaign, launch another Dispatch, promote Claims, commit Git history, mutate canonical Research, or broaden scope.
