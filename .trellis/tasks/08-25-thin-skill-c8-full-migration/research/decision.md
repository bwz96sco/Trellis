# C8 full-migration decision

Decision: **BLOCKED**

Reason: all three attempted `literature-01` arms returned `API Error: 400 unknown provider for model claude-sonnet-5`; each result is nonretryable, 0/18 usable calls and 0/6 case evaluations exist, and model substitution is forbidden.

Deterministic proof: `passed`.

No live/full-migration pass is claimed unless the append-only ledger contains all 18 usable A/B/C calls and every applicable assertion passes.
