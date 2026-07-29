# Technical design

## Boundary

Trellis becomes host-neutral Research execution control plane. Root ledger owns activation and approval. Procedures define bounded worker instructions. Claude/Codex remain adapters, not policy engines. Workers retain proposal-only authority.

## Control flow

```text
Quest stage + capability
  -> immutable capability registry
  -> strict project policy
  -> strict Procedure resolver
  -> Dispatch + activation events
  -> automatic authorization OR interactive approval
  -> read-only Dispatch Context
  -> generic host worker
  -> Result + Proposal + approval consumption
  -> root apply/reject Decision
```

## Canonical state and compatibility

- Preserve schema-v1 event parsing and existing aggregate payloads byte-for-byte.
- Add explicit schema-v2 parsing only for activation/approval event families.
- Replay mixed ledgers in sequence through one reducer.
- Activation and approval live in reduced canonical state; existing tracked projection schemas remain unchanged.
- Existing v1 ledgers are never rewritten. Once first v2 event exists, rollback is forward-fix only.
- Audit sidecars may mirror canonical receipts but never become authority.

## Capability and policy

Registry definitions bind ID, stage, kind, activation mode, authority, Procedure ID, network policy, repository scope, limits, and approval requirements. Runtime cannot mutate registry. Project policy may tighten limits only. Missing/malformed policy fails closed. Workflow classification cannot be downgraded.

Initial Procedure inventory:

- setup: `project-setup-v1`
- framing: `quest-framing-v1`, `quest-admin-v1`
- literature: `literature-scan-v1`, `literature-review-v1`
- ideation: `idea-generation-v1`, `idea-evaluation-v1`
- experiment: `experiment-round-v1`, `experiment-campaign-v1`
- computation: `computation-case-v1`
- theory: `theory-case-v1`
- audit: `review-case-v1`, `review-campaign-v1`
- writing: `writing-case-v1`

No automatic capability may launch another Procedure or Dispatch.

## Procedure resolution

Each Procedure has strict `procedure.json` plus `PROCEDURE.md`. Resolution checks path containment, regular files, no symlinks, supported version, ID/stage/kind agreement, declared bounds, and explicit override replacement metadata. Digest uses deterministic metadata serialization plus exact instruction bytes. Existing malformed project override blocks execution instead of falling back.

## Approval model

Activation binds Dispatch, Quest, capability, Procedure digest, policy digest, and scope hash. Approval additionally binds host, immutable request digest, mode, approver label, rationale, timestamps, expiry, and status. `authorize` handles only policy-eligible bounded work. `approve` handles workflows/out-of-policy work through interactive TTY summary and challenge phrase; no `--yes`. This proves operator interaction, not cryptographic identity.

Dispatch Context performs all checks without mutation. Approval consumption joins existing Result + Proposal atomic batch. Revocation and expiry block future Context. Canonical Result uniqueness prevents repeat accepted execution.

## Host execution

Both workers accept identical normalized JSON with Dispatch, activation, approval, capability, embedded Procedure, declared context, write paths, checks, and immutable authority flags. Workers never discover Skills, read arbitrary Procedure files, grant approvals, mutate canonical state, review Proposals, expand sandbox scope, commit Git history, or spawn agents.

## Migration and cleanup

Add separate immutable Research Skill retirement evidence; do not edit frozen generic cleanup inventory. Update/uninstall reuses exact path/hash ownership logic. Delete only current bytes matching released pristine hash. Preserve modified files, unknown descendants, malformed entries, external `research-*` Skills, active workers/hooks, and `.trellis/research/**`. Remove dirs only when empty.

## Rollout

Core v2 reader precedes emitters. Registry/Procedure/policy land inactive. Commands precede Context gate. C06 and C07 form one atomic public-acceptance group: C06 may land buildable internal Context/consumption primitives while the complete legacy public lifecycle remains usable, but public Context, public record-result, mandatory consumption, both workers, shared hook, and generated Research workflow instructions switch together under C07. Neither child archives before named host-adapter/public-lifecycle verification, executable spec-contract validation, and full gates. Archive preflight requires empty effective `after_archive` hooks, exact active/destination checks, and dual-task/session byte snapshots. After both commands report success, verify only allowed task metadata/session deltas. Failure of either invocation or any post-success check restores both children and all captured session state. Generation stops after host parity. Cleanup evidence precedes Skill source deletion. Packed negative audit and historical upgrade rehearsal precede parent closeout.
