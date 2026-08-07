# CS6-4 Procedure 2.0.7 package design

## Boundary

Package generation is a pure deterministic projection from accepted contract leaves and reviewed runtime/package rules into new immutable version directories.

## Package shape

Each package contains `procedure.json`, `PROCEDURE.md`, and an enumerated `methodology/` support pack with artifact, lifecycle, closure, validator, binding, instruction, inventory, and digest members. No sibling file is authoritative unless listed and hashed.

## Generation model

- Load exact accepted leaves by hash.
- Derive package-specific rows without changing accepted semantics.
- Serialize strict canonical JSON and stable Markdown bytes.
- Compute inventory and Procedure digests using the existing versioned domains.
- Validate every cross-file identity before writing the final tree.

## Immutability

`2.0.7` is new. Once committed, its bytes become immutable evidence. Corrections after commit require a later Procedure version. Historical `2.0.4`–`2.0.6` remain read-only throughout.

## Rollback

Before commit, remove only the uncommitted `2.0.7` trees/generator/test/evidence and regenerate. Never modify a historical tree.
