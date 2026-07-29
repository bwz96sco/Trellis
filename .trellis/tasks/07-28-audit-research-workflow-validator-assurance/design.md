# Design — F03 validator assurance

## Isolation model

```text
source validators (read-only path)
  -> copy fixtures to private/ephemeral work dir (outside Trellis git or under task-local untracked sandbox)
  -> run with uv run python when authorized
  -> ledger hashes + exit codes into tracked research/ (aggregate only)
```

Do not check private fixture bodies into Trellis. Fixture manifest stores path-in-source + sha256 + classification.

## Mutation catalog categories

missing-evidence, provenance-drift, id-drift, illegal-authority, invalid-closure, invalid-composition, malformed-handoff.

## Defect classification

| Class | Meaning |
|-------|---------|
| source-validator-defect | false accept/reject, nondeterminism, mutates inputs |
| source-prose-gap | rule only in prose |
| evaluation-infra | harness/env failure |

Never relabel infra as source defect.
