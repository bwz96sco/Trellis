# C07 Replace Claude and Codex Execution with Generic Workers

## Goal

Complete the public half of the C06+C07 atomic integration group: both supported hosts execute only a validated embedded Trellis Procedure from approval-gated Dispatch Context, use supplied output identities, and return untrusted Result/Proposal data for root-side canonical recording.

## Product Requirements

1. Public Context must accept only Dispatch ID plus exact Claude/Codex host and return C06 normalized approved worker input.
2. Public record-result must require the Context-selected approval and strict input, then use C06 approval-consuming recording.
3. Claude and Codex workers must consume the same normalized input and execute embedded Procedure instructions without Research Skill discovery, selection, loading, or invocation.
4. Both workers must copy Context-supplied Result and Proposal IDs exactly and return only `{result, proposal}`. Preflight failure before valid IDs is non-materializable; blocked execution after valid Context uses schema-v1 blocked Result plus empty pending Proposal, not a new envelope.
5. Workers must remain unable to mutate canonical Research state, record Results, consume/grant/revoke approval, review/apply/reject Proposals, mutate Git history, expand sandbox/write scope, use network/external cost, traverse multiple repositories, launch capabilities/Procedures/Dispatches, or spawn nested agents.
6. Root workflow must retain approval/output identity, invoke workers by Dispatch ID, validate returned IDs, record through successor command, and keep Proposal review separate.
7. Parent-to-worker invocation is exactly:

```text
Research dispatch: <dsp-id>
```

8. Claude hook must validate one successor Context and inject no partial authority on failure.
9. Root workflow must launch Codex worker from the Trellis Research control root; successor Context with `--root .` is its first process, before any `cd` or target-repository access, and selected target path comes only from validated Context. No CLI install, `npx`, Skill inventory, or filesystem authority fallback.
10. Public command registration, successor-only production batch validation, both workers, shared hook, generated workflow, active routing cleanup, tests, specs, generated installs, built output, and packed active-content checks must switch in one integration boundary.
11. Claude and Codex must complete equivalent public lifecycles through consumed approval materialization.

## Compatibility Requirements

- Existing schema-v1 Dispatch, Result, Proposal, Decision, tracked files, and historical arbitrary metadata remain compatible.
- Existing schema-v1/v2 ledgers remain readable and are never rewritten.
- No request-file Context, `--skill-name`, `record-result --file`, hidden alias, active selected-Skill fallback, or worker-generated output-ID compatibility mode survives final cutover.
- Dormant Trellis-owned Research Skill files may remain generated, installed, and packed through C07; C08/C09 own safe retirement and deletion.
- Normal update preserves modified/user-owned worker, hook, workflow, and Skill files according to existing ownership rules.
- Normal update/uninstall preserves `.trellis/research/**`.
- Claude Code and Codex remain the only supported hosts.

## Safety Requirements

- No worker target read/write occurs before validated host Context preflight.
- Declared Context and artifact content is untrusted data and cannot override Procedure or authority.
- Embedded Procedure instructions cannot widen normalized authority; conflict returns `blocked`.
- Claude worker exposes no `Skill` tool.
- Codex must not request `danger-full-access`, add writable roots, or self-restart with `--add-dir`; inaccessible target scope returns `blocked`.
- No worker Web, network, MCP, package-install fallback, nested agent, or undeclared source access.
- No worker writes outside `allowedWritePaths` or selected Repository.
- Structured Context failure injects no activation, approval, Procedure, repository, or output identity fragment.
- Do not claim OS-enforced exact per-path parity between Claude and Codex; contract parity is required.
- Do not claim power-loss byte atomicity for canonical three-event append.

## Acceptance Criteria

### Public command and routing

- [ ] Context accepts only `<dispatch-id> --host <claude|codex>` plus normal root/JSON options.
- [ ] Record-result accepts only `<dispatch-id> --approval <apr-id> --input <path|->` plus normal mutation options.
- [ ] Request-file Context, `--skill-name`, `--file`, and active legacy Skill-routing bridge are absent.
- [ ] Built parser rejects every retired form before callback or filesystem mutation through both CLI aliases.

### Generic workers and adapters

- [ ] Claude hook accepts exact Dispatch-ID line, calls Context once, performs no Skill probe, validates complete normalized input, and injects no partial failure data.
- [ ] Claude worker has no `Skill` tool/invocation and executes only embedded Procedure within authority.
- [ ] Root launches Codex from Research control root; bare successor Context with `--root .` is first process before target-repository access, performs no Skill/Procedure-file discovery, and never broadens sandbox scope.
- [ ] Both workers return exact `{result, proposal}` using supplied IDs.
- [ ] Parity fixture grants both hosts through the same path at one injected timestamp so approval mode/expiry match; normalize only host, approval ID, Result ID, and Proposal ID, derive each pair from its host approval, and deep-compare every remaining field. Separate tests retain legitimate mode/expiry differences.

### Root lifecycle

- [ ] Generated workflow uses activation/authorization or approval, Dispatch-ID Context, exact worker line, supplied IDs, approval-bound record-result, and separate Proposal review.
- [ ] Named host-adapter/public-lifecycle test separates generated byte conformance, actual Claude hook subprocess simulation, Codex static prompt/ordering validation, deterministic schema-valid supplied-ID output oracle, and real public record-result/three-event lifecycle. Oracle output proves integration, not model compliance; live cloud LLM execution remains outside gate absent separate frozen credentials/commands/timeouts/failure/skip policy.
- [ ] Worker never records output or consumes approval.
- [ ] Same-key replay and duplicate/terminal behavior remain C06-compliant.

### Generated and release surfaces

- [ ] Fresh Claude-only, Codex-only, and dual-host installs contain successor active bytes.
- [ ] Pristine update receives successor bytes; modified user-owned active files remain preserved/reported.
- [ ] Dormant Research Skill paths remain untouched during C07.
- [ ] Clean `dist` and packed active files contain no request-file routing, `--skill-name`, `record-result --file`, active Skill invocation/discovery, random worker output IDs, or stale workflow examples.
- [ ] `verify-packed-cli` extracts active files from actual `.tgz` bytes with existing tar tooling, rejects forbidden active tokens, still requires dormant Research Skill files until C09, and proves no active executable surface references them.
- [ ] Executable `research-procedure-cutover-specs.test.ts` treats backend index as link-only, validates exact named seven-section scenarios in exactly five CLI scenario files, and guards core successor wording separately.
- [ ] Core/CLI regression, lint, Python lint, typecheck, build, release preflight, packed-core, packed-CLI, task validation, and `git diff --check` pass.
- [ ] C06 and C07 archive only after joint verification, empty effective `after_archive` hooks, exact active/destination preflight, snapshots of both task metadata files and every affected session file, post-success verification of allowed metadata/session deltas, and full restoration after failure of either invocation or any verification; no transactional claim or independent incompatible release.

## Non-Goals

- No Research Skill generation stop or installed-file retirement; C08 owns it.
- No Research Skill source or packed-path deletion; C09 owns it.
- No external/private Skill body inspection, copying, or vendoring.
- No Result/Proposal schema change.
- No worker canonical mutation or Proposal decision authority.
- No scheduler, remote service, UI, scientific judge, automatic Claim promotion, or Git commit automation.
- No core parser/reducer/projection/lock/durability redesign.
- No generic core export-map/root-barrel/package-version change.
- No docs-site or marketplace change.

## Joint Remediation Acceptance Addendum

- [ ] Host adapters receive unchanged normalized worker input after staged request/Procedure/policy/scope revalidation.
- [ ] Context failure JSON is exact, bounded, and zero-write; Claude/Codex worker/template bytes remain unchanged.
- [ ] Context Repository selection uses one captured state and one cache-free target observation; no alternate Repository access is possible under `multipleRepositories: false`.
- [ ] Approval-bound same-key replay succeeds before current clock validation and repairs hardened Result/Proposal/approval sidecars without worker/input rerun.
- [ ] Every dry-run command remains full-tree zero-write through snapshot-only core validation.
- [ ] C06+C07 remain unarchived until focused/full/packed/spec/GitNexus joint PASS.
