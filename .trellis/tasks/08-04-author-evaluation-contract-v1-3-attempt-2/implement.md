# V13-A attempt-2 implementation

## Steps (after separate activation)

1. Record exact P1 C0 ancestor commit and C0 manifest/lock digests.
2. Author `author-accountability-v1.3-attempt-2.json` + sidecar with accountable human identity disclosure.
3. Regenerate full candidate set with top-level `attemptBinding`.
4. Deterministic rebuild and independent digest recomputation (do not import production R2A parser as oracle).
5. Write `execution-evidence-ledger.json`.
6. Request separate authorization for authoring-only commit of this directory.

## Stop conditions

Missing accountability, path escape, private-source dependency, incomplete 64/65/20 domains, digest collision with attempt-1 without `attemptBinding`, or production-path touch.
