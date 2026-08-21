# T6 MAL-1 Attempt-4 M0 correction design

## Boundary

```text
T0A Attempt-4 governance 4b1bb3cd
  -> C-M0C exact-three verifier correction fdb2c97a
  -> G-M0C exact-six governance (this task)
  -> fresh restored-M0 instruction
  -> M0-A4 exact-three reviewer definition
  -> separate M1-A4 exact-six committed authority
  -> fresh M1 execution instruction
```

Each commit retains independent authority. No predecessor grants successor execution.

## Confirmed failure

The retained verifier previously accepted T0A exact-six only on the earlier successor-scope correction descendant. With the authorized M0-A4 three files dirty, it reported those exact paths as `unexpectedDirty` and exited nonzero. Exact-three correction commit `fdb2c97a10f445e8b1cdfe8c3a05cea9497010c2` resolves that bootstrap deadlock without changing serialized retained evidence.

Custom Git-object checks remain useful diagnostics but do not replace the mandated verifier.

## Runtime-scope correction

The correction reuses the narrow topology-bound classifier pattern:

```text
base = T0A commit 4b1bb3cd

HEAD = exact one-commit descendant
changed paths base..HEAD = exact-three correction inventory
runtime successor inventory = exact-six G-M0C governance files

HEAD = exact two-commit descendant
aggregate changed paths base..HEAD = correction inventory + governance inventory
runtime successor inventory = exact-three M0-A4 reviewer-definition files
```

Correction commit `fdb2c97a` authenticates the first classification. This governance commit must use it as the direct parent and establishes the second classification for a later separately authorized M0 restoration. Every other path or topology remains rejected.

The runtime allowance must not enter serialized retained records. Final I3/S3 identity, candidate tuple digest, protected-path audit, and exact-subject freeze remain byte-stable.

## Mechanical M1 authority

The restored reviewer definition must remove boolean-only M1 authority. Future normal execution requires two committed inputs:

1. M0 definition commit:
   - parent equals the authenticated exact-six governance commit that directly descends from correction `fdb2c97a`;
   - changed inventory equals exact M0-A4 three paths;
   - committed task, assignment, and reviewer program match runtime bytes and declared identities.
2. M1 authority commit:
   - parent equals authenticated M0 definition commit;
   - changed inventory equals exact six files under `.trellis/tasks/08-21-authorize-t6-mal1-attempt-4-run/`;
   - normative `task.json` binds the M0 commit/tree, fresh reviewer identity, exact 26 commands, exact-nine create-only outputs, single-run authority, denied authorities, and no repair authority.

A CLI confirmation may acknowledge operator intent but cannot substitute for either committed input.

## Preserved M0 candidate

The current M0 exact-three candidate remains preserved outside the repository. This governance commit contains no M0 bytes. After this governance boundary commits, a fresh runtime instruction may permit restoration; the candidate must authenticate correction `fdb2c97a`, bind the resulting governance commit as its direct parent, and add committed-object M1 authentication before validation.

## Failure routes

- Governance failure before commit: remove only this new task directory; preserve committed correction `fdb2c97a`.
- Any defect in the committed correction or a later committed boundary requires a new forward correction. Never amend, reset, rebase, squash, or rewrite retained evidence.
- Any extra path, generic allowance, mutable authority, reviewer launch, or assurance output: stop.

## Code-spec decision

Correction commit `fdb2c97a` updated the existing unit-test convention because runtime successor-scope behavior is an executable retained-verification contract. This governance commit itself changes no code spec.
