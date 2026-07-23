# Implementation — Freeze research compatibility contracts

## Prepare

- [x] Read research state, CLI command, filesystem safety, and update specs.
- [x] Inspect existing research test helpers and fixture conventions.
- [x] Run GitNexus impact on any test helper symbol changed.

## Core fixtures

- [x] Add complete fixed schema-v1 ledger fixture.
- [x] Add expected reduced-state assertions.
- [x] Add deterministic projection/rebuild assertions.
- [x] Add strict malformed/sequence compatibility assertions if not already covered.

## CLI and packaging fixtures

- [x] Add Dispatch request/result/proposal/decision compatibility fixtures.
- [x] Add `ownerSkill` plus `taskRef` preservation assertions.
- [x] Add current package export-resolution test.
- [x] Add 0.6.7 multi-host manifest and mixed-config fixtures without applying cleanup yet.

## Verify

- [x] Run focused core research tests.
- [x] Run focused CLI research and package tests.
- [x] Run lint/typecheck/build for affected packages.
- [x] Run `git diff --check`.
- [x] Run GitNexus change detection before commit.
