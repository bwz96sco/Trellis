# V13-A implementation plan — Author evaluation contract v1.3

## 0. Authorization gate

Do not start authoring until:

- C0 parent overlays, ownership amendment, preservation record, and both child plans validate;
- the task remains limited to its planning files and candidate `research/**` allowlist;
- the user separately approves `task.py start` for V13-A;
- protected historical hashes and inherited dirty paths are captured;
- no private-source access is requested or available.

Task activation authorizes candidate authoring only. It does not authorize the immutable authoring commit, V13-B assurance, runtime/test/Procedure work, packaging, activation, release, or push.

## 1. Ordered authoring

1. Revalidate the active v1.2 identity/digest, Wave-8 audit digest, parent C0 preservation record, and ownership map.
2. Snapshot the V13-A allowlist, protected historical paths, and inherited dirty paths.
3. Build `public-evidence-index-v1.3.json` from public sources only, recording stable source IDs, paths, immutable digests, and exact line/JSON-pointer citations.
4. Build `normative-decision-ledger-v1.3.json`; classify every new decision as `trellis-native-v1.3` and include rationale, rejected alternatives, compatibility effect, visibility, validator obligations, and fixture obligations.
5. Enumerate the exact 64-output source set and populate `durable-output-disposition-v1.3.json` with one unique disposition per identity.
6. Populate `artifact-lifecycle-contract-v1.3.json`. For every authorized artifact/checkpoint, define all 13 lifecycle dimensions; use explicit `inapplicable` or `blocked-by-contract` records where necessary.
7. Populate `closure-contract-v1.3.json` with exact family, source record/artifact, JSON pointer, type, null/absence, producer, reader, evidence, order, zero-write, error, and validator rules. Add a machine-checkable prohibition on undeclared `Result.status` inference.
8. Populate `validator-registry-v1.3.json` and `validator-binding-matrix-v1.3.json` with exact `(id, version, severity)` contracts, duplicate rejection, and trusted severity ceilings.
9. Populate `derivability-provenance-matrix-v1.3.json` so every normative leaf resolves to exactly one provenance class and required evidence/decision record.
10. Decide whether normalized inventory, IO ledger, or v1.3 delta matrix materially changes. Produce only required conditional files and record every produce/omit decision.
11. Write `evaluation-contract-v1.3.0.md` and `frozen-migration-target-v1.3.json` from the completed contract set.
12. Canonicalize all machine-readable files, compute exact lengths/hashes, write the candidate manifest, then write filename-bound target and manifest sidecars.
13. Rebuild independently from the same inputs and require byte-identical outputs and digests.
14. Populate `execution-evidence-ledger.json` with exact argv arrays, cwd, environment allowlist, exit codes, assertion IDs/outcomes, retained output paths/digests, and before/after snapshots.
15. Run privacy, path-allowlist, historical-hash, and dirty-path checks.
16. Request independent review of the uncommitted candidate. Resolve findings only within V13-A and regenerate all affected digests.
17. Run final task validation and diff hygiene.
18. Present the exact candidate inventory/digests and request separate authorization before creating the immutable V13-A authoring commit.

## 2. Deterministic verification requirements

The future execution ledger must record exact invocations for:

- strict UTF-8, BOM, malformed JSON, duplicate decoded-key, unknown/missing-key, enum, path, and ordering mutation checks;
- provenance-class and exact-citation completeness;
- exact 64-output set equality, uniqueness, alias target validity, and disposition coverage;
- all 13 lifecycle dimensions or explicit inapplicable/blocked coverage;
- closure field/type/null/producer/reader/order/zero-write checks and rejection of status heuristics;
- validator triple uniqueness, registry membership, and severity non-downgrade;
- manifest membership, byte lengths, SHA-256 values, and filename-bound sidecars;
- deterministic rebuild in an independent temporary location;
- privacy scan and proof that no private path/body was read or embedded;
- before/after protected-hash and inherited-dirty-path comparison;
- `uv run python ./.trellis/scripts/task.py validate .trellis/tasks/08-03-author-evaluation-contract-v1-3`;
- `git diff --check` restricted to V13-A-owned paths.

Do not use production R2A parsers as the sole oracle. Verification logic must independently recompute canonical bytes and digests.

## 3. Stop gates

Stop and report blocked if:

- a normative field lacks one of the four provenance classes;
- an inherited claim lacks an exact public citation/digest;
- any of the 64 outputs is missing, duplicated, or silently omitted;
- any authorized lifecycle rule lacks one of the 13 dimensions without explicit inapplicable/blocked disposition;
- closure requires an undeclared `Result.status` heuristic;
- a validator binding lacks exact ID, version, or severity;
- a private-source read, transmission, or dependency would be required;
- any write would leave the child allowlist;
- historical/protected hashes or inherited dirty paths change;
- deterministic rebuild or task validation fails.

## 4. Rollback and commit boundary

Before an authoring commit, remove or correct only V13-A candidate files; active v1 and all historical evidence remain unchanged. After an authorized authoring commit, defects require a new authoring commit and digest, and V13-B must restart from the new exact inputs. No amend, history rewrite, activation, package lifecycle, release, publication, or push is authorized.
