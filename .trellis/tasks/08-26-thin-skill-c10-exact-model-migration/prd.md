# Recover exact-model C10 migration

## Goal

Complete the blocked Research Skill migration through a forward C10 successor that proves every live evaluation slot uses only first-party `claude-sonnet-5`, passes the six-case A/B/C gate, then migrates the ten remaining Research Skills and packed distribution inventory.

## Background

C9 remains immutable at commits `8d39c4a8` and `cacbd39c` with `blocked-nonretryable-provider-failure`. Its first `literature-01/A` call returned usable text but reported `claude-haiku-4-5-20251001`, `claude-sonnet-5`, and `claude-fable-5`. The installed `claude` command resolved through the cmux wrapper and inherited Claude Code session, effort, advisor, prompt-suggestion, messaging, and model controls.

The operator approved the proposed forward repair: bypass the wrapper, isolate child environment, use the first planned slot as the exact-model probe, continue only when `modelUsage` contains exactly `claude-sonnet-5`, then finish the existing migration sequence.

## Requirements

1. Preserve C1, C7, C8, and C9 evidence byte-for-byte. Never rewrite or retry C9.
2. Authenticate reusable C10 inputs from committed C9 Git objects at `cacbd39c` rather than C9 working-tree bytes.
3. Resolve and record the direct versioned first-party Claude CLI executable, bypassing `/Applications/cmux.app/Contents/Resources/bin/claude`.
4. Child processes must remove inherited proxy, credential, provider, model, nested-session, fork, messaging, advisor, prompt-suggestion, effort, and parent-session overrides without changing the parent process environment.
5. Child processes must explicitly set:
   - `CLAUDE_CODE_DISABLE_ADVISOR_TOOL=1`
   - `CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION=0`
   - `CLAUDE_CODE_EFFORT_LEVEL=low`
   - `CLAUDE_CODE_ALWAYS_ENABLE_EFFORT=0`
6. Live commands must request `claude-sonnet-5`, one turn, low effort, no tools, no slash commands, no session persistence, and first-party OAuth.
7. The first planned `literature-01/A` slot is also the route probe; it is not an extra call.
8. Authorized C10 live boundary remains 18 planned A/B/C calls, at most 6 valid no-output infrastructure retries, and 24 total attempt reservations. No model substitution, provider expansion, auxiliary model identity, nested worker, or automatic continuation is allowed.
9. Any result whose `modelUsage` is not exactly one `claude-sonnet-5` identity is nonretryable and stops C10 immediately.
10. Create case evaluations only after all A/B/C siblings for that case are usable. Require every zero-tolerance, quality, and overhead assertion.
11. Migrate the ten remaining packages and expand packed distribution to sixteen package versions only when `fullMigrationClaimAllowed` is true.
12. Use normal hooks for commits. Preserve the eight unrelated dirty files. Do not push, release, publish, or open a PR.

## Acceptance Criteria

- [ ] C10 predecessor verification authenticates all copied inputs from `cacbd39c` and excludes C9 ledger, outputs, summary, decision, and proof artifacts.
- [ ] Direct executable evidence proves the cmux wrapper is not launched.
- [ ] Unit tests prove exact environment removal/overrides and parent-environment immutability.
- [ ] Deterministic proof passes before any C10 reservation.
- [ ] First live slot reports exactly one `claude-sonnet-5` model identity.
- [ ] Eighteen usable A/B/C slots and six complete case evaluations exist within the 24-attempt cap.
- [ ] `fullMigrationClaimAllowed` equals true before package expansion.
- [ ] Ten new packages, sixteen total versions, thirty members, and sixty-two packed assets authenticate.
- [ ] Focused/full Core and CLI verification, builds, packed audit, diff checks, and normal hooks pass.
- [ ] C10/product evidence is committed; unrelated dirty files remain restored; no push/release/publication occurs.

## Out of Scope

- Reclassifying or deleting C9 evidence.
- Relaxing the exact-model gate.
- Switching provider, model, auth method, or SDK.
- Adding a second package registry, workflow engine, state writer, or capability symmetry.
- Modifying the dirty source checkout.
