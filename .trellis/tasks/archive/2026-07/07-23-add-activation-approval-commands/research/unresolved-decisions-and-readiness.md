# Research: Unresolved Decisions and Readiness

- **Query**: Separate frozen requirements from implementation recommendations, close remaining design choices where possible, and assess C05 readiness.
- **Scope**: internal
- **Date**: 2026-07-17

## Findings

### Readiness

**C05 is ready for PRD, design, and implementation-manifest authoring.**

C01-C04 freeze enough behavior to implement C05 without rereading broad source. The only unavoidable high-risk area is the CRITICAL shared core batch builder needed for typed mixed-version emission. All other risky existing helpers can remain unchanged behind new C05 modules.

### Frozen requirements

The following are normative and must not be reopened by implementation:

- exact five C05 command changes: prepare capability, plan-activation, authorize, approve, revoke;
- unchanged schema-v1 Dispatch payload;
- unchanged `ownerSkill`, `provider`, and `taskRef` compatibility semantics;
- prepare event order: v1 Dispatch then v2 activation;
- one v2 event for plan/grant/revoke commands;
- ledger authority and sidecar non-authority;
- event commit before sidecar materialization;
- same-key recovery without replacement append;
- automatic grant constants and strict bounded eligibility;
- all-three-stream TTY gate for approve;
- exact challenge phrase and no `--yes`;
- no cryptographic identity claim;
- one captured command time and exact expiry arithmetic;
- one active unexpired grant per activation/host;
- expiry derived from event timestamps, never reducer wall clock;
- revocation before or after expiry, but not after terminal transition;
- C06 owns Context gating and consumption;
- current Result/Proposal batch remains unchanged;
- forward-fix-only rollback after first schema-v2 event.

### Recommended decisions to freeze in design

1. **Digest API boundary**: put `digestDispatchRequest` and `hashDispatchScope` in a new public core Research subpath module, exported only by `@mindfoldhq/trellis-core/research`.
2. **Historical request materialization**: require `plan-activation` to verify existing `request.json` against canonical Dispatch, but never rewrite it.
3. **Interactive approval scope**: allow `approve` for a valid automatic-mode bounded activation when automatic policy opt-in is absent; reject `enabled: false`.
4. **Actor semantics**: retain `{type:"agent", id:"trellis-cli"}`; operator label is descriptive approval metadata only.
5. **Revocation reason**: require explicit `--reason` for JSON and dry-run, even when the process happens to have TTY streams.
6. **Command results**: return canonical `ResearchApprovalState`, not only the grant, from grant/revoke commands.
7. **Materialization repair**: after grant/revoke, rewrite only the target activation and affected approval sidecars; do not rewrite unrelated approvals.
8. **Idempotency conflicts**: detect a same-key event family/target mismatch and fail with `IDEMPOTENCY_KEY_CONFLICT`.
9. **Interactive recovery**: require strong TTY and the canonical challenge again before an `approve` retry rewrites its sidecar.
10. **Timestamp executor**: add a C05-specific mutation executor accepting a captured timestamp rather than modifying the HIGH-risk shared executor.
11. **Context isolation**: implement a separate C05 authority/scope preflight module and leave current production Context untouched; C06 can adopt the module later.
12. **Store boundary**: make only the minimal version-aware draft change in `buildValidatedBatch`; do not edit `validateDispatchBatch`.
13. **Error output**: preserve typed error codes in JSON as `{error:{code,message}}`, while keeping current committed-recovery structures.
14. **Success output**: add `activation`, `approval`, and sidecar-path fields to existing mutation-result metadata; dry-run paths are `null`.

### Decisions resolved from the frozen contract

#### Can approve grant an automatic-mode activation?

Yes, when the activation is otherwise valid but automatic authorization is unavailable, especially because project `automaticEnabled` is false. The frozen contract explicitly assigns `approve` to explicit, workflow, and out-of-automatic-policy activation. It cannot override a disabled capability or binding drift.

#### Is operator label an authenticated identity?

No. The existing CLI actor remains canonical event provenance. `approverLabel` is operator-supplied descriptive metadata and makes no cryptographic identity claim.

#### Can revoke prompt while using JSON or dry-run?

No. The frozen text says `--reason` supplies the required reason for JSON and dry-run. Prompting in those modes would make automation nondeterministic.

#### Who owns Context and Result consumption?

C06 only. C05 may create reusable preflight functions but must not change the current Context signature, gate Context, require approval for record-result, or emit `approval.consumed`.

### Residual non-blocking caveats

- Exact human success-line formatting was not frozen. Existing generic mutation rendering is sufficient if JSON result fields remain stable.
- C01 did not name codes for invalid label/rationale, unknown revoke ID, or idempotency-family collision. Recommended codes are `INVALID_APPROVAL_INPUT`, `APPROVAL_NOT_FOUND`, and `IDEMPOTENCY_KEY_CONFLICT`.
- The exact prompt sequence for repairing an already committed interactive grant was not frozen. Requiring TTY plus the canonical challenge again best preserves both recovery and no-automation requirements.
- `resolveRepositoryForUse(root, id, false)` performs no observation write but still reads the runtime observations file. This is acceptable for a minimal C05 boundary, but C06 may later choose the Context-specific repository resolver when consolidating zero-write preflight.

### Implementation sequence

1. Add and test request/scope digest APIs.
2. Add typed C05 core mutations and version-aware event drafts.
3. Add C05 authority/scope preflight and timestamp-aware executor.
4. Extend prepare with capability and atomic activation.
5. Add plan-activation and sidecar materialization.
6. Add authorize and automatic-eligibility mapping.
7. Add strong-TTY approve and exact challenge.
8. Add revoke and terminal transition handling.
9. Add same-key recovery paths.
10. Update executable specs and run package/packed verification.

### Acceptance gate

C05 is complete only when:

- new prepare emits exactly v1 Dispatch then v2 activation atomically;
- historical bridge appends only activation and rewrites no request/Dispatch state;
- automatic grants are impossible outside frozen bounds;
- interactive approval has no automation bypass;
- all grants bind activation, host, request, Procedure, policy, scope, and expiry;
- revocation is canonical and terminal;
- sidecars are reconstructible from ledger state;
- same-key recovery never appends replacement authority;
- all schema-v1 compatibility tests remain unchanged;
- Context, Result/Proposal, workers, Skills, and C07-C09 surfaces remain outside the diff;
- CRITICAL changed-scope review shows no unexplained flow expansion.

### Related Specs and Contracts

- `.trellis/tasks/07-23-replace-research-skills-with-trellis-procedures/prd.md` — parent requirements and exclusions.
- `.trellis/tasks/07-23-replace-research-skills-with-trellis-procedures/design.md` — parent control-plane architecture.
- `.trellis/tasks/archive/2026-07/07-23-freeze-procedure-capability-policy-contracts/research/activation-approval-contract.md` — normative C05/C06 lifecycle contract.
- `.trellis/tasks/archive/2026-07/07-23-freeze-procedure-capability-policy-contracts/research/procedure-capability-policy-contract.md` — registry, policy, Procedure, request digest, and scope hash contract.
- `.trellis/tasks/archive/2026-07/07-23-freeze-procedure-capability-policy-contracts/research/compatibility-freeze.md` — permanent schema-v1 and metadata compatibility.
- `.trellis/spec/cli/backend/commands-research.md` — C05 CLI spec ownership after implementation.
- `.trellis/spec/core/backend/research-state.md` — typed emitter spec ownership after implementation.

## Caveats / Not Found

No blocking product decision remains if the recommendations above are adopted in the C05 design. The main implementation warning is the CRITICAL blast radius of `buildValidatedBatch`; it requires explicit acknowledgement before editing and full v1/mixed-ledger regression coverage.
