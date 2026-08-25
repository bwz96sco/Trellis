# C7 Single-Writer Remediation Design

## 1. Forward Evidence Boundary

Historical identities stay immutable:

```text
C1 source identity e2b0d70... -> failed source-admin refusal in archived C7
Guarded identity 86df5a6...   -> new remediation proof
```

New task authenticates successor source dependency. It does not reopen or rewrite C7.

## 2. Baseline Shape

```text
research/source-authority-baseline/
├── README.md
├── manifest.json
└── files/
    └── skills/
        ├── research-quest-admin/scripts/research_quest_admin.py
        └── research-quest/scripts/research_quest.py
```

Admin helper is changed executable. Quest helper is its dynamic sibling dependency. Remaining C1 files stay authenticated by original C1 baseline and are not duplicated.

## 3. Capture Contract

`research/build_source_authority_baseline.py --capture`:

1. Uses Git object reads for exact commit `86df5a6`; never reads helper bytes from source working tree.
2. Verifies immediate parent `e2b0d70` and exact changed path `skills/research-quest-admin/scripts/research_quest_admin.py`.
3. Verifies frozen C1 manifest digest and old helper identity.
4. Copies exactly two path-listed blobs from guarded commit.
5. Writes canonical manifest with provenance, transition, members, and aggregate digest.

Capture failure leaves no accepted baseline. Mutable branch/working-tree state cannot substitute for missing Git object evidence.

## 4. Verify Contract

`--verify` reads only task-local baseline and predecessor C1 baseline. It validates:

- exact schema, canonical manifest bytes, and literal path allowlist;
- exact copied file set, no missing/extra directories or files;
- path, Git executable mode, role, byte length, and SHA-256 per member;
- old/new helper fixed identities and predecessor manifest digest;
- aggregate digest over source provenance, capture timestamp, canonical inventory, and exact member bytes.

External source checkout is not accessed in verify mode.

## 5. Runtime Proof

Existing `research-quest-source-admin.integration.test.ts` remains authoritative. `TRELLIS_RESEARCH_QUEST_ADMIN` selects frozen guarded helper. Its existing fixture executes supported Trellis import and asserts canonical `writer.json` authority, read-only behavior, all mutating refusals, byte stability, transfer recovery, fence handling, malformed writer-projection refusal, missing import-projection refusal, source identity drift, and ambiguity.

No duplicate product or task-local behavioral test is added unless unchanged suite cannot execute against baseline.

## 6. Result Contract

`single-writer-proof.json` records:

- proof/schema IDs and timestamp;
- predecessor and guarded source identities;
- baseline manifest/digest identity;
- verification commands and observed results;
- `single-quest-writer: pass` for guarded identity;
- provider/model/worker counts of zero;
- unchanged live-evaluation and migration authorization state.

`decision.md` explains forward-only effect in human-readable form.

## 7. Rollback and Stops

- Capture/auth failure: do not write passing proof.
- Integration failure: preserve failure output, keep blocker uncleared, do not run provider or migration work.
- Unexpected product edit need: stop and re-plan after GitNexus impact analysis.
- Success clears deterministic blocker only; no automatic continuation into live C7 or C8 migration.
