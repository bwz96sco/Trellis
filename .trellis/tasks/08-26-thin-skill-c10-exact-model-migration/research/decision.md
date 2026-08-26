# C10 exact-model migration decision

Decision: **BLOCKED**

Reason: first formal slot `literature-01/A` returned usable content but `modelUsage` contained two first-party identities, `claude-sonnet-5` and `claude-haiku-4-5-20251001`. The exact-one-model rule classified this as a nonretryable failure. Evidence: `outputs/literature-01-a/attempts/16f6b305-5d4b-4f56-a7bc-92684c069161/stdout.json`.

No retry or later slot was launched: 0/18 usable calls and 0/6 case evaluations exist.

Deterministic proof: `passed`.

No live/full-migration pass is claimed unless the append-only ledger contains all 18 usable A/B/C calls and every applicable assertion passes.
