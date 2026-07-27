# C06 Gate Dispatch Context and Result Consumption

## Goal

Add the internal authority primitives required for a zero-write, Dispatch-ID-based Research Context and approval-bound Result recording, while preserving a coherent legacy public lifecycle until the C06+C07 atomic cutover.

## Product Requirements

1. Context authority must derive only from canonical mixed-version Research state plus strict, non-authoritative request/activation/approval materializations.
2. Context must require one valid activation, current capability/Procedure/policy/request/scope bindings, and one valid host-bound approval.
3. Context must embed the validated Procedure and complete bounded authority; workers must not discover Skills or read authority files as fallback.
4. Context success and every failure must be exactly zero-write.
5. Context must supply stable Result and Proposal IDs derived through one pure approval-bound helper.
6. Root-side Result recording must bind worker output to the selected approval and consume that approval with Result and Proposal in one validated canonical batch.
7. Existing schema-v1 Result and Proposal payloads and tracked files remain unchanged.
8. Historical `ownerSkill`, `provider`, and `taskRef` remain warning-only compatibility metadata.
9. No aggregate `contextDigest` is added; existing request, Procedure, policy, and scope bindings remain authority.
10. C06 and C07 form one atomic public-acceptance group. C06 may add buildable internal successor paths, but public Context, public record-result, mandatory three-event enforcement, both workers, shared hook, and generated workflow instructions switch together under C07.

## Compatibility Requirements

- Existing schema-v1 ledgers and mixed v1/v2 replay remain valid.
- During C06 internal preparation, legacy public Context, `record-result --file`, current workers/hooks/workflow, and the existing two-event Result/Proposal batch remain mutually usable.
- Internal consumption support may additionally validate the exact three-event successor family, but must reject consumption-only, mixed, reordered, extra, or mismatched batches.
- No hidden request-file, `--skill-name`, or `--file` compatibility mode survives final C07 cutover.
- Normal update/uninstall and historical Research data behavior remain unchanged.
- Claude Code and Codex remain the only supported hosts.

## Safety Requirements

- No Context lock acquisition, runtime/lock directory creation, observation write, session/manifest write, projection rebuild, sidecar repair, target Repository write, or Git mutation.
- Read-side materialization validation must reject symlinks, non-regular files, containment escape, replacement, race, malformed envelopes, wrong IDs, unknown keys, and semantic drift.
- Pure Node behavior must be documented as detect-and-fail, not mathematical `openat` race freedom.
- One append call supplies application-level all-before-append behavior, not formal power-loss byte atomicity.
- Workers remain unable to record Results, consume approval, mutate canonical Research state, review Proposals, alter Git history, expand sandbox scope, use network/external cost, or spawn agents.

## Acceptance Criteria

### Internal C06 readiness

- [ ] Dispatch-ID/typed-host successor Context exists behind a direct/internal API.
- [ ] Successor Context returns the frozen normalized worker input and preserves outer command literal `research dispatch context` when publicly activated.
- [ ] Request sidecar failures map to `REQUEST_STATE_MISMATCH`; activation/approval sidecar failures map to `MATERIALIZATION_STATE_MISMATCH`.
- [ ] Approval relation/index validation precedes host/state selection; expiry equality is rejected.
- [ ] One shared `deriveResearchOutputIds` helper preserves accepted UUID suffix casing and returns stable `res_`/`prp_` IDs.
- [ ] Unrelated derived-ID occupation returns `OUTPUT_ID_CONFLICT`.
- [ ] Context zero-write snapshots pass for every success/failure path.
- [ ] Typed `approval.consume` mutation emits existing strict schema-v2 consumption through the exact successor batch.
- [ ] Package-private `recordApprovedResearchDispatchResult` uses frozen approval/input/cwd/test-clock/mutation/result types; replay performs only required pre-await lexical root/path resolution, never opens/reads input or invokes stdin, and three-materialization recovery passes.
- [ ] Legacy public lifecycle remains usable after each internal C06 stage.

### Joint C06+C07 acceptance

- [ ] Public Context accepts only `<dispatch-id> --host <claude|codex>` plus normal root/JSON options.
- [ ] Public record-result accepts only `<dispatch-id> --approval <apr-id> --input <path|->` plus normal mutation options.
- [ ] Legacy two-event Result/Proposal production is rejected after cutover.
- [ ] Claude worker, Codex worker, shared hook, and generated Research workflow consume the successor contract together.
- [ ] Named host-adapter/public-lifecycle tests cover generated-byte conformance, actual Claude hook process invocation, Codex static prompt contract, deterministic supplied-ID output oracle, and real public record-result through consumed sidecar; oracle output is not claimed as model compliance.
- [ ] Host parity grants both hosts through the same path/time so mode and expiry match, normalizes only host, approval ID, Result ID, and Proposal ID, derives each pair from its approval, and deep-compares all remaining fields; separate tests retain legitimate mode/expiry differences.
- [ ] Built and packed output contain no request-file Context routing, `--skill-name`, `record-result --file`, Skill invocation, random worker Result/Proposal IDs, or stale workflow examples.
- [ ] Executable spec-contract test treats backend index as link-only, validates exact named seven-section scenarios in exactly five CLI scenario files, and guards core successor wording separately.
- [ ] C06 and C07 archive only after full joint verification, empty effective `after_archive` hooks, exact active/destination preflight, dual-task/session byte snapshots, post-success verification of allowed metadata/session deltas, and full restoration after failure of either invocation or any post-success check; archive grouping is not transactional.

## Non-Goals

- No worker/template/hook/workflow ownership change inside C06; C07 owns those files within the atomic group.
- No Research Skill retirement or packed-source deletion; C08/C09 own cleanup.
- No Result/Proposal schema-v1 change.
- No new tracked activation/approval projections.
- No ledger durability redesign.
- No generic core export-map/root-barrel/package-version change.
- No docs-site or marketplace change.
- No commit or push during planning.

## Joint Remediation Acceptance Addendum

- [ ] Revalidation emits binding drift in exact request -> Procedure -> policy -> scope order before lower-priority Repository/artifact failures.
- [ ] Context uses one captured `ResearchState`, rejects foreign Repository artifacts before alternate access, and reuses one cache-free target Repository observation for scope, artifacts, and write paths.
- [ ] Every CLI dry-run path uses snapshot-only core validation and creates no Research lock/runtime/projection/cache state.
- [ ] Public Context failures use the exact structured `safeAction: "report-to-root-no-write"` envelope with no partial Context.
- [ ] Exact same-key result replay is classified before current clock validation and input access.
- [ ] Result and Proposal sidecars reuse hardened activation/approval publication checks; same-key replay repairs all three files without append.
- [ ] Creation-time activation, lockful validation/commit, worker payload, public command signatures, schema-v1 Result/Proposal, and packed host assets remain unchanged.
