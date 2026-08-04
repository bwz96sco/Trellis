# V13-B attempt-2 design

## Method

Independent digest recomputation from committed Git blobs. Mutation fixtures fail closed. No V13-A builder-as-oracle. No candidate/production repair.

## Assignment commit contents (P3 only)

- task.json activation
- reviewer-assignment JSON + sidecar
- binds exact P2 authoring SHA, C0 digests, candidate/target/accountability digests, author and reviewer canonical IDs (byte-unequal), Codex adjunct fields

## Assurance commit contents (P4 only)

Exactly nine outputs listed in PRD.
