# Design — Freeze research compatibility contracts

## Fixture layout

Keep fixtures close to existing core and CLI test suites:

- core research ledger and projection fixtures under `packages/core/test/research/fixtures/`
- CLI Dispatch and legacy installation fixtures under `packages/cli/test/fixtures/`

Use JSON/JSONL fixture files rather than generating opaque state in each test. Expected projections should be explicit files or normalized objects so regressions show semantic diffs.

## Coverage boundaries

- Production research code is read-only in this child.
- Existing public parsers/reducers/rebuilders are exercised directly.
- Package export tests assert current compatibility; they do not introduce deprecations yet.
- Legacy host fixtures capture ownership evidence, not active support policy.

## Determinism

Use fixed IDs and RFC3339 timestamps. Avoid machine-local absolute paths. Repository and artifact paths remain portable relative paths.
