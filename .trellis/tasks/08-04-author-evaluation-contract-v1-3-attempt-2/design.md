# V13-A attempt-2 design

## Architecture

Public-evidence index → Trellis-native decision ledger → lifecycle/disposition/closure/validator matrices → deterministic canonical JSON → candidate manifest (root inventory) → frozen-migration-target (authoritative contract digest). Author-accountability and `attemptBinding` are mandatory top-level bindings.

## Isolation

Authoring commit touches only `08-04-author-evaluation-contract-v1-3-attempt-2/**`. Portable C0 and Wave-7 archives are read-only inputs from the P1 ancestor commit.

## Rollback

Discard unaccepted candidate bytes in this directory only. Never rewrite attempt-1, historical packages, or live v1 containment.

## Acceptance evidence

Deterministic rebuild digests, complete provenance classification, 64 dispositions, 13 lifecycle dimensions or explicit inapplicable/blocked, no private dependency.
