# T0A — T6 MAL-1 Attempt-4 design

## Boundary

This standalone exact-six governance overlay advances the repaired subject chain without inheriting or collapsing authority.

```text
G-I3 c01c6f92
  -> I3 88626c04
  -> S3 4219fb16
  -> G-I3 closure cc344c72
  -> predecessor descendant 98899925
  -> successor-scope correction f2f34b7f
  -> T0A Attempt-4 governance
  -> fresh runtime authorization
  -> exact-three M0-A4 reviewer definition
  -> separate M1-A4 governance and authorization
```

T0A does not modify the existing T6 task, assignment, reviewer program, technical subject, or historical evidence.

## Immutable input model

M0-A4 must authenticate committed Git objects, not mutable worktree claims:

- G-I3 governance commit, parent, tree, and exact-six inventory;
- final I3 commit, parent, tree, and exact-nine inventory;
- final S3 commit, parent, tree, and freeze blob;
- G-I3 closure commit, parent, tree, and exact-one inventory;
- predecessor descendant `98899925` plus exact-three successor-scope correction commit `f2f34b7f`, parent, tree, and inventory;
- current corrected descendant commit/tree plus protected hashes and gitlinks;
- immutable Attempt 1–3 evidence commits and fail verdicts.

Any mismatch stops before M0 output.

## M0-A4 correction

M0-A4 owns three existing files. It may:

- replace Attempt-3/I2/S2 constants with Attempt-4/I3/S3/G-I3-closure bindings;
- define `research/attempt-4` as a create-only exact-nine destination;
- assign a new independent reviewer identity and isolated worktree/session;
- correct only the reviewer-side offline pnpm metadata cache so `pnpm import` can resolve required metadata without network access;
- update focused self-checks and authority assertions required by those changes.

It may not edit package, source, test, subject, historical evidence, or any path outside exact M0-A4.

## Role and containment

The future reviewer must differ from T0–T5 actors and Attempts 1–3 reviewers. A new agent, session, branch, and worktree are mandatory; resume/fork/shared scratch are forbidden. The reviewer remains machine-only and may emit only an honest pass or fail.

Archive extraction, controlled PATH, provider tripwires, Darwin network denial, isolated package-manager roots, protected-worktree checks, bounded privacy-safe failed-command diagnostics, exact command ordering, and atomic output publication remain unchanged.

## Authority separation

```text
T0A commit
  defines M0-A4 inventory
  does not execute M0-A4

fresh M0 instruction + committed T0A
  permits exact-three M0-A4
  does not permit reviewer launch or M1 output

future committed M1-A4 authority + fresh M1 instruction
  may permit one Attempt-4 run
```

T6-CLOSE and T7 remain later independent gates.

## Failure disposition

Before commit, remove only this new task directory if governance validation fails. After commit, use a new forward correction task. Never amend, reset, rebase, squash, overwrite evidence, or silently widen an inventory.

## Code-spec decision

No code-spec update is required. This boundary governs campaign authority and evidence ownership; it changes no executable contract.
