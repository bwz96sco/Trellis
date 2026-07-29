# Implementation Plan — C10

## Done

1. Added `release-preflight smoke-installed-cli` for packed Core+CLI consumer install.
2. Added closeout integration tests for Skill-free installs, update dry-run, historical preserve, uninstall deferral, idempotent update.
3. Preserved Research stage Skill ownership keys in `manifest-prune` so uninstall can apply retirement gates.
4. Updated release-process spec for installed smoke.

## Remaining verification

```bash
pnpm --filter @mindfoldhq/trellis-core test
pnpm --filter @mindfoldhq/trellis test
pnpm --filter @mindfoldhq/trellis lint
pnpm --filter @mindfoldhq/trellis typecheck
node packages/cli/scripts/release-preflight.js check-versions
# optional full pack smoke already covered by test/scripts/smoke-installed-cli.test.ts
```

## Non-actions

- Do not archive C08/C09/C10/parent without separate authorization.
- Do not push or publish.
