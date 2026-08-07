# CS6-3 CLI recording/auth/replay/recovery design

## Boundary

The CLI is an orchestration adapter. It authenticates inputs, calls reviewed core semantics and protected canonical operations, and records explicit outcomes. It does not redefine the accepted contract.

## Recording flow

```text
strict stdin
  -> Dispatch/Activation/Approval authority validation
  -> installed accepted-bundle authentication
  -> exact Procedure/support-pack resolution
  -> core methodology validation/report construction
  -> canonical Result/Proposal commit through existing protected API
  -> report/projection materialization
  -> explicit success or committed-recovery-required outcome
```

Before the canonical commit, every failure is zero-write. After a successful protected commit, a materialization failure cannot be described as rollback; it produces deterministic recovery metadata bound to the committed event identity.

## Replay flow

Replay loads exact recorded identities rather than current registry defaults. Missing or mismatched historical dependencies fail closed with stable errors and no reinterpretation.

## Installed-bundle model

Bundle authentication is path-independent and based on exact bytes/member ledger. Source-tree-relative assumptions and `.git` availability are forbidden.

## Rollback

Before commit, revert only owned adapters/tests. After commit, use a forward correction. Never delete or reinterpret canonical history or accepted bundle bytes.
