# T0A — v1.3.1 forward technical repair implementation plan

## Ordered execution

1. Validate and commit this exact six-file standalone T0A overlay.
2. Run GitNexus upstream impact analysis for every existing function, class, or method before editing; stop and warn on HIGH or CRITICAL risk.
3. Correct the stale T4 consumer without editing the 116-row evidence.
4. Apply only the identified Core and CLI lint repairs.
5. Change historical T5 `--verify` to authenticate retained I1/I2 Git objects and add a real archive-isolation regression.
6. Run focused syntax, lint, and regression checks.
7. Run full Core gates serially, then full CLI gates, workspace typecheck, and packed-package preflights.
8. Run `git diff --check`, verify the exact staged allowlist, and run staged GitNexus change detection.
9. Commit R3 separately as a new descendant. Do not amend any prior commit.
10. Stop before I3/S3 work unless its standalone governance has been created and committed.

## Verification

- Use `uv run python` for Python execution.
- Verify the T4 population is exactly 116 total, 100 code-presence, and 16 production-prevention rows.
- Run targeted ESLint without auto-fix over all changed Core and CLI files.
- Run the T4 coverage and both historical integration suites.
- Run `node --check` and direct `--verify` for both audit scripts.
- Run the archive-isolation regression against committed Git objects.
- Run Core lint, typecheck, test, and build before CLI lint, typecheck, test, and build.
- Run root typecheck and packed Core/CLI release preflights.
- Confirm `AGENTS.md`, `CLAUDE.md`, `docs-site`, `marketplace`, `.claude/worktrees`, and the untracked CS5 record are unstaged.

## Stop routes

Stop on HIGH/CRITICAL impact, unexpected path or execution-flow impact, any historical/T4 evidence mutation, live/private recapture during historical verify, failed required verification, or any activation, provider, network, publication, release, push, worker-authority, or T7 action.
