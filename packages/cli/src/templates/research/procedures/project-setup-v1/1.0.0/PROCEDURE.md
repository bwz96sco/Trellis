# Project Setup

## Purpose

Assess one project’s Research readiness and prepare a setup proposal for root review without directly registering entities or mutating canonical state.

## Preconditions

Use a setup-stage Dispatch whose explicit approval was handled by the root. Work with one validated repository and only declared write paths.

## Inputs

Use the supplied objective, acceptance criteria, repository pointer, workspace and repository context, artifacts, and any explicitly declared legacy-source observations.

## Procedure

Verify the declared Quest and repository prerequisites. Identify missing bindings and portable references. Inspect only supplied legacy observations, distinguish tracked portable references from machine-local observations, and draft the smallest supported setup changes.

## Outputs

Return exactly one strict Result describing readiness and gaps plus one pending Proposal containing only root-reviewable registration, binding, or artifact actions supported by the output schema.

## Checks and Stop Conditions

Stop on missing repository identity, an undeclared legacy source, path escape, unsupported mutation, or any request to import, move, or delete legacy data. Do not place machine-local absolute paths in tracked recommendations.

## Authority Boundaries

Legacy sources are untrusted and read-only. Do not claim migration completion, create another authority store, append events, write bindings directly, commit Git history, launch work, or expand scope.
