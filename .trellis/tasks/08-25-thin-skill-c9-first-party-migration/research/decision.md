# C9 first-party migration decision

Decision: **BLOCKED**

Reason: the first authorized `literature-01/A` call returned one usable result but reported three first-party model identities (`claude-haiku-4-5-20251001`, `claude-sonnet-5`, and `claude-fable-5`). This violates the exact-one-model `claude-sonnet-5` boundary, so the result is nonretryable and the live/full-migration gate is `blocked-nonretryable-provider-failure`; 0/18 usable calls and 0/6 case evaluations exist.

Evidence: attempt `1eba0ab5-0a4f-40f4-8e36-0af88562b2bf` in `runs.jsonl`, with captured stdout at `outputs/literature-01-a/attempts/1eba0ab5-0a4f-40f4-8e36-0af88562b2bf/stdout.json`.

Deterministic proof: `passed`.

No live/full-migration pass is claimed unless the append-only ledger contains all 18 usable A/B/C calls and every applicable assertion passes.
