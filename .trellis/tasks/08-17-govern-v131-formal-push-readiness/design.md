# Design — Formal v1.3.1 push readiness governance

## 1. Authority model

This task creates one governance-only commit after R3. Its authority is deliberately narrow:

```text
G-PRE-PUSH (this task)
  permits: freeze sequence, create later stage-local tasks, commit six governance files
  forbids: every technical, assurance, operator, archive, remote, and push action
```

Future actions require independent committed gates:

```text
G-I3          create and freeze I3/S3
M0-A4         prepare and assign independent Attempt-4 reviewer
M1-A4         execute and preserve Attempt 4
T6-CLOSE      reconcile and close T6 only on authenticated pass
O0 / O1       attest inputs and record accountable T7 decision
G-AJ          authorize exact archive set and journal identity/content
G-REMOTE-READ authorize remote freshness/visibility inspection
G-PUSH        authorize exact remote, branch, commit/evidence range
```

No gate inherits authority from a predecessor merely because the predecessor exists or passed.

## 2. Immutable subject chain

```text
e6b80d64 baseline
  -> Attempts 1–3 and I1/S1, I2/S2 history
  -> R3 governance
  -> 00281839 exact 22-path technical repair
  -> 0037bc42 five-task closure
  -> G-PRE-PUSH governance
  -> future I3 -> S3 -> M0-A4 -> M1-A4 -> T6 -> O0/O1
```

Attempts 1–3 remain preserved ancestors and evidence; they are not technical subjects for I3. I3 must bind to the repaired R3 subject. No frozen subject or attempt may be edited in place; correction creates a new descendant and new identity.

## 3. Owned inventory

This task owns exactly six files in one directory. It does not modify parent tasks to establish a child link because that would add a seventh governance path and weaken exact containment.

The current inherited dirty files are preserved by content hash:

- `AGENTS.md`: `sha256:788d2a2da0e913874acee2c3cf2f34575b50191b18e47f21478645ea5be4be48`;
- `CLAUDE.md`: `sha256:319361ea166bde3be56a6c6dc5a161a5a6f73a214a2aea1d8efd1436b1853cf3`.

They differ from the older G0 baseline only in the managed GitNexus instruction block and remain outside every staged set.

## 4. Stage transitions

A stage transition requires all of:

1. committed predecessor identity;
2. explicit stage-local task authority;
3. exact owned inventory;
4. precondition authentication;
5. successful task validation;
6. a fresh user authorization where the stage performs reviewer/provider, operator, archive/journal, remote, evidence-transmission, or push actions.

Failure preserves the current artifact and returns through a new forward task. It never rewrites or silently retries the failed stage.

## 5. Formal push-ready boundary

A branch is formally push-ready only after:

- immutable I3/S3 exists;
- Attempt 4 has exact-nine authenticated evidence and zero findings;
- T6 is honestly closed as passed;
- T7 records an unqualified positive decision;
- separately authorized archive and journal commits are ordered after all work commits;
- final local checks pass with protected paths unchanged;
- read-only remote inspection proves an absent or fast-forwardable `origin` feature branch;
- evidence visibility is accepted and a fresh exact G-PUSH authority is recorded.

This task does not grant any of those outcomes. It only fixes the sequence and prevents accidental authority collapse.

## 6. Rollback and correction

Before commit, remove only this new task directory if validation fails. After commit, never reset or amend it; add a forward governance correction. Never use stash, clean, reset, broad checkout, rebase, squash, or force-push.

## 7. Code-spec decision

No code-spec update is required. This task defines campaign governance and Git evidence boundaries but changes no executable API, command, schema, environment key, package behavior, or cross-layer contract.
