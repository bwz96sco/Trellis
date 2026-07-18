# Implementation — Trellis research workflow V1

## Execution order

- [ ] Child 1: research core and deterministic store.
- [ ] Child 2: lifecycle CLI; depends on child 1 API.
- [ ] Child 3: repository registry and dispatch; depends on children 1–2.
- [ ] Child 4: managed research workflow; may proceed after core contracts stabilize.
- [ ] Child 5: Task/session integration; depends on lifecycle IDs and CLI patterns.
- [ ] Child 6: skills and Claude hooks; depends on CLI/dispatch/workflow contracts.
- [ ] Child 7: specs and end-to-end proof; integrates all prior children.

## Per-child gates

1. Run GitNexus upstream impact for every existing symbol before edit; report blast radius.
2. Complete child `prd.md`, `design.md`, and `implement.md`.
3. Configure `implement.jsonl` and `check.jsonl` with canonical `file` keys.
4. Start child task only after artifact review.
5. Dispatch implementation/check agents with active task path.
6. Run focused tests, explicit `trellis-check`, and archive child only when green.
7. Return to parent for cross-child acceptance review.

## Final integration

- [ ] Run full multi-repo Quest → Campaign → Run → Evidence → Claim scenario.
- [ ] Exercise projection recovery and malformed-ledger failure.
- [ ] Verify Task clear preserves `current_run`.
- [ ] Verify native/research/custom workflow update matrix.
- [ ] Scan tracked files for absolute paths and runtime/Mempal content leaks.
- [ ] Run `pnpm test`.
- [ ] Run `pnpm lint`.
- [ ] Run `pnpm --filter @mindfoldhq/trellis lint:py`.
- [ ] Run `pnpm typecheck`.
- [ ] Run `pnpm build`.
- [ ] Run full-diff `trellis-check`.
- [ ] Run GitNexus `detect_changes({ scope: "compare", base_ref: "main" })`.

## Rollback points

- Core export/module can be removed without changing existing domains.
- CLI can be unregistered while research files remain data.
- Dispatch/hook branches can be disabled while manual lifecycle CLI remains.
- Workflow can switch back to native without deleting `.trellis/research`.
- Task links remain inert metadata if integration is reverted.
