# G132 attempt-2 governance design

## Authority chain

```text
A11 3534529a36a10ea8015a51f71a93e2b78300a563
  -> G131 15de62625685c32f00edf9aef8f2c1cf5a05d7bb immutable first-attempt governance
  -> A131-0 9392f20ce0dd93107205ed7c28dc964b5879b7bc immutable route history
  -> G132 sibling governance
  -> future A132-0/A132-1 authoring
  -> future B132-0/B132-1 fresh MAL-1 assurance
  -> future O132-0/O132-1 separate operator decision
  -> STOP
```

No predecessor identity is renamed, resumed, amended, or used as a mutable working-tree oracle.

## Evidence derivation

G132 reads Procedure projection authority only from commit `0afef5adaea2a58c8c6cc5a3f1a51a054fa1a39d`. Each exact `methodology/lifecycle/lifecycle-rows.json` blob is bound by path, blob OID, byte length, and SHA-256. Thirteen projections have a non-null outer family, non-empty rows, and matching row families. Survey, writing, figure, and slides have null family and empty rows.

The accepted v1.3.0 lifecycle leaf supplies the immutable 65-artifact, 11-family, 13-dimension, and 845-binding domains. G131 supplies the closed 17 Procedure/capability identity order, propagation classifier, digest domains, historical-reference guards, and all other finding obligations.

## Replacement model

The mapping row is a closed tagged union represented by five required fields:

- applicable: `artifactFamily` is one exact codomain string;
- notApplicable: `artifactFamily` is exactly null.

The tag is `disposition`. Null cannot compare equal to a lifecycle binding family and cannot enter the codomain. Complete matrix enumeration evaluates every mapping row against every one of the 845 lifecycle bindings using the exact two-clause equation.

## Continuity model

The supersession record authenticates the complete G131 allowlist blob. It identifies only the exact G131 fields whose non-null assignment assumption or 845-only corpus is replaced. All unlisted G131 JSON values remain controlling and byte-authenticated through the immutable blob. G131 authority/containment digest framing is preserved exactly.

## Validation modes

- Precommit mode pins HEAD to `9392f20ce0dd93107205ed7c28dc964b5879b7bc`, requires an empty staged set, exact 36 G132 dirty paths plus five inherited protected dirty entries, exact owned-root inventories, old-root zero drift, append-only parent overlays, and deterministic evidence.
- Committed-tree mode accepts `--subject <commit>`, requires that subject's first parent be `9392f20ce0dd93107205ed7c28dc964b5879b7bc`, compares the exact subject path set to the 36-path boundary, reads task/governance bytes from the subject tree, and does not require future HEAD to remain at the historical predecessor.

Both modes reject invalid UTF-8, duplicate decoded keys, non-finite numbers, unpaired surrogates, missing/unknown governance keys, non-canonical governance JSON/JSONL, CR bytes, and invalid final-LF framing.
