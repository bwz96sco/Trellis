# Core Backend Guidelines

These guidelines apply to `packages/core`.

## Purpose

`@mindfoldhq/trellis-core` owns reusable SDK/domain primitives that must stay
independent of CLI rendering and process-control concerns.

## Source Map

| Area | Path | Purpose |
| --- | --- | --- |
| Root exports | `packages/core/src/index.ts` | Package root public API. Keep this small. |
| Channel API | `packages/core/src/channel/` | Durable channel/event APIs, reducers, workers, inbox, runtime contracts. |
| Mem API | `packages/core/src/mem/` | Persisted AI session readers, search, filtering, dialogue extraction, and project aggregation. |
| Task API | `packages/core/src/task/` | Reusable task record, schema, phase, and path helpers. |
| Research API | `packages/core/src/research/` | Strict research ledger, lifecycle validation, deterministic projections, and portable artifact/repository references. See [Research State and Deterministic Store](./research-state.md). |
| Testing API | `packages/core/src/testing/` | Reserved 0.7 compatibility namespace; importable and empty. |
| Package proof | `packages/core/scripts/` | Independent packed-core tar validation and isolated consumer verification. |
| Tests | `packages/core/test/` | Core-owned domain, export-contract, and packed-audit coverage. |

## Contracts

- Core APIs must not print terminal output, call `process.exit`, parse CLI argv,
  or depend on Chalk / Commander / Inquirer.
- Production CLI code may import core only through the exact public Research subpath, `@mindfoldhq/trellis-core/research`; compatibility consumers may use the other explicit public entry points.
- Public subpaths must be declared explicitly in `packages/core/package.json`; wildcard/deep exports are forbidden.
- Root composition remains Channel plus Task only, while Testing remains importable and empty.
- Core and CLI publish together with the same version, and release preflight must verify a real clean-built packed core tarball before either package publishes.
- Detailed package-boundary rules currently live in
  `.trellis/spec/cli/backend/trellis-core-sdk.md`; keep this file and that
  boundary spec consistent until the detailed core rules are split fully under
  `.trellis/spec/core/`.

## Pre-Development Checklist

- Read `.trellis/spec/cli/backend/trellis-core-sdk.md` before editing
  `packages/core/**` or moving logic between CLI and core.
- Read `.trellis/spec/cli/unit-test/conventions.md` before adding or changing
  core tests.
- For Channel, Mem, or Task compatibility changes, also read
  `.trellis/spec/cli/backend/trellis-core-sdk.md`. These are SDK domains and do
  not have active CLI command specifications.
- For research-state, event-store, projection, lifecycle, or portable artifact
  changes, also read
  `.trellis/spec/core/backend/research-state.md`.

## Quality Check

Run the package-scoped checks that match the change:

```bash
pnpm --filter @mindfoldhq/trellis-core lint
pnpm --filter @mindfoldhq/trellis-core typecheck
pnpm --filter @mindfoldhq/trellis-core test
```

For changes that affect CLI imports or release packaging, also run the root typecheck path and the real packed-core verifier so both workspace and packed declaration resolution are exercised:

```bash
pnpm typecheck
node packages/cli/scripts/release-preflight.js verify-packed-core
```
