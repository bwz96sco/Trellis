# Unit Test Guidelines

> Testing conventions and patterns for this project.

---

## Overview

This project uses **Vitest** with TypeScript ESM. Tests live in a centralized `test/` directory mirroring `src/` structure. The goal is fast, reproducible tests with minimal mocking.

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Conventions](./conventions.md) | File naming, structure, assertion patterns, test isolation (env-leak guard), when to write tests | Done |
| [Mock Strategies](./mock-strategies.md) | What to mock, how, and the minimal mocking principle | Done |
| [Integration Patterns](./integration-patterns.md) | Function-level command tests, built-parser/bin rejection tests, filesystem snapshots, production import boundaries, and independent packed-core/CLI audits | Done |

---

## Quick Reference

```bash
# Run the complete repository gate (Core, then all CLI projects)
pnpm test

# Run all CLI projects only
pnpm --filter @mindfoldhq/trellis test

# Watch CLI tests
pnpm --filter @mindfoldhq/trellis test:watch

# Focused project/file diagnostic — not a substitute for the complete gate
pnpm --dir packages/cli exec vitest run --project normal test/commands/init-research-only.integration.test.ts

# Inspect exact project ownership
pnpm --dir packages/cli exec vitest list --project normal --filesOnly

# Verify independent clean packed artifacts
node packages/cli/scripts/release-preflight.js verify-packed-core
node packages/cli/scripts/release-preflight.js verify-packed-cli

# Run all CLI projects with coverage (terminal + HTML)
pnpm --filter @mindfoldhq/trellis test:coverage
```

---

## Code Coverage

Coverage is generated automatically via `@vitest/coverage-v8`. Configuration is in `vitest.config.ts`.

- **Terminal**: `pnpm --filter @mindfoldhq/trellis test:coverage` prints the aggregated per-file coverage table for all CLI projects
- **HTML report**: `./coverage/index.html` (gitignored, generated on demand)
- **Source scope**: `src/**/*.ts` (excludes `src/cli/index.ts`)

Do **not** maintain a manual coverage table — always run `pnpm --filter @mindfoldhq/trellis test:coverage` from the repository root for the real numbers.

---

## CI / Pipeline Strategy

| Stage | What Runs | Contract |
|---|---|---|
| **pre-commit** (husky) | `pnpm lint-staged` → initialize `marketplace` → clear inherited Git coordinates → root `pnpm test` | The hook runs the complete Core suite followed by all ordered CLI projects. Do not bypass it or treat a focused project as equivalent. |
| **CI** (GitHub Actions, PR gate) | install → `pnpm typecheck` → `pnpm lint` → `pnpm test` → `pnpm build` → verify build outputs | CI executes the same complete root tests before the final build/output check. |

CLI Vitest uses four positive, distinctly ordered projects with exact disjoint ownership: Procedure, production-116, normal, and canonical `dist` mutation. [Conventions](./conventions.md#ordered-project-ownership) defines their setup, workers, ordering, coverage, and partition invariants.

Focused project/file runs are causal diagnostics only. Acceptance still requires the complete applicable coverage run and the unchanged repository hook. Derive current suite counts and timing from Vitest output; do not preserve them as static documentation claims.

**When to reconsider**: preserve the current topology until complete-suite evidence identifies a new distinct resource or shared-output owner. Govern that case separately rather than increasing budgets, retrying, or serializing ordinary tests automatically.

---

## Pre-Development Checklist

Before writing or improving tests:

1. Read [conventions.md](./conventions.md) — file naming, structure, assertion patterns, when to write tests
2. Read [mock-strategies.md](./mock-strategies.md) — what to mock, how, minimal mocking principle
3. For command-level tests, read [integration-patterns.md](./integration-patterns.md)

---

## Quality Check

After writing tests:

1. Ensure tests follow conventions (naming, structure, assertions)
2. Verify mocking is minimal — prefer real code paths
3. Run validation:
   ```bash
   pnpm lint && pnpm typecheck && pnpm test
   ```
4. Check coverage decisions — report any gaps with rationale

---

**Language**: All documentation should be written in **English**.
