# T0A — T4 production evidence correction implementation plan

## Ordered execution

1. Validate and commit this exact six-file governance overlay.
2. Authenticate Attempt-2 evidence commit `1d389f3` and the exact correction ancestry.
3. Run GitNexus upstream impact for `expectedCodesPresent`; stop on HIGH or CRITICAL.
4. Modify exactly:
   - `packages/cli/test/commands/research-methodology-116-production.test.ts`
   - `.trellis/tasks/08-12-build-v1-3-1-production-harness/research/production-116-case-evidence.jsonl`
5. Remove `productionPrevented` from the helper's code-presence calculation and assert `codesPresent || productionPrevented`.
6. Run the focused production test so it regenerates the evidence.
7. Verify exact 116-row identity/order, sixteen false code-presence rows paired with production prevention, unchanged remaining rows, and no extra path.
8. Run CLI typecheck/focused test, diff check, exact staged inventory, and staged GitNexus detection.
9. Commit the exact two-path correction. Do not refreeze or run T6 in the same commit.

## Stop routes

Stop on any production-source change, new equivalence, population drift, unexpected generated path, Attempt-2 mutation, or operational action. Route production defects to their owning stage rather than repairing them here.
