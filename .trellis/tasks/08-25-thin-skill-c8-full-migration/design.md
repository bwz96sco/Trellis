# C8 Full Migration Design

## 1. Boundary

C8 adds package content and forward evaluation evidence on top of the existing runtime. It does not add another execution architecture.

```text
exact source Git objects
  -> self-contained authenticated baseline
  -> pilot semantic alignment
  -> deterministic + live successor gate
  -> ten schema-v3 packages
  -> existing resolver / profiles / Workflow / gates / Quest authority
```

Historical evidence is immutable. C8 evidence has new identities and append-only run records.

## 2. Source Baseline

`research/build_source_baseline.py` has two modes:

- build: authenticate external repository commit/tree/parent/branch, enumerate the exact committed source inventory, write frozen files and canonical manifest;
- `--verify`: authenticate frozen files and manifest only, without reading the external repository.

The manifest records repository provenance, source path, Git mode, blob OID, byte size, SHA-256, role, and one aggregate SHA-256 over canonical ordered entries. JSON parsing rejects duplicate keys. Canonical JSON uses sorted keys, compact separators, UTF-8, and final LF.

Frozen layout:

```text
research/source-baseline/
├── README.md
├── manifest.json
└── files/<source-relative-path>
```

## 3. Complete Disposition

| Source Skill | Trellis disposition | Profiles / authority |
|---|---|---|
| literature | existing package, forward version only on drift | lightweight + `research.literature.review` |
| ideation | existing package, forward version only on drift | lightweight + `research.ideation.generate` |
| idea-evaluation | existing package | managed `research.ideation.evaluate` |
| quest-admin | existing package | root-command only |
| quest | native Quest/Workflow/gate/import/export/writer state | no package |
| synthesis | new `1.0.0` | lightweight |
| opportunity-mining | new `1.0.0` | lightweight |
| experiment | new `1.0.0` | lightweight + `research.experiment.round` |
| computation | new `1.0.0` | lightweight + `research.computation.case` |
| theory | new `1.0.0` | lightweight + `research.theory.case` |
| figure | new `1.0.0` | lightweight |
| writing | new `1.0.0` | lightweight + `research.writing.case` |
| slides | new `1.0.0` | lightweight |
| review-case | new `1.0.0` | lightweight + `research.audit.case` |
| project-setup | new `1.0.0` | lightweight + `research.setup.project` |

`migration-matrix.json` also maps excluded host projections, source validators/helpers, and source-local authority files to manifest policy or existing Trellis commands/state.

## 4. Package Shape

Every new package uses the existing schema-v3 parser and one immutable directory:

```text
packages/cli/src/templates/research/skills/<id>/1.0.0/
├── skill.json
├── SKILL.md
└── declared source-derived members
```

Manifest bytes are canonical. Members are included only when the committed method requires them. Templates/references use on-demand loading. Root-only material is never projected into worker Context. All handoffs are declarative and `autoInvoke: false`.

No package contains state mutation, provider calls, child dispatch, campaign orchestration, report packs, source-local validators, or duplicate prompt bodies.

## 5. Pilot Alignment

For literature and ideation, compare frozen source method obligations with current adapted package behavior:

- method equivalent: evaluate current `1.0.0`;
- material added/removed method obligation: create `1.1.0`, leaving `1.0.0` byte-identical.

Difference in host-specific syntax alone is not material drift when existing Trellis commands/manifests provide the same behavior. Evidence records each decision and exact accepted package identity.

## 6. Successor Evaluation

Evaluation artifacts:

```text
research/
├── evaluation-plan.json
├── cases/<case-id>.json
├── runs.jsonl
├── outputs/<run-id>/...
├── deterministic-proof.json
├── summary.json
└── decision.md
```

Each A/B/C arm has an isolated workspace and frozen input. `runs.jsonl` is append-only. A correction creates a superseding record; it never rewrites prior output. Evaluator reads case outputs only after all arms complete.

Arms:

- A: baseline Claude execution without Research Skill method;
- B: exact committed source method;
- C: exact accepted Trellis package/profile method.

Six live cases produce 18 planned calls. Deterministic Quest-admin cases validate command/state ownership without provider use. Retry is legal only for documented infrastructure failure with no usable result. Hard cap is 24.

Gate outcome is binary for zero-tolerance checks. Expansion occurs only after all nine pass plus quality/overhead acceptance. Failure writes forward evidence and stops.

## 7. Distribution

Rename the exported pilot inventory to a general bundled Research Skill inventory through GitNexus-aware rename. Inventory supplies exact required packed paths for all package versions and declared members. Packed audit still parses/authenticates manifests; inventory adds required-presence guarantees.

Production integration tests use one data matrix rather than package-specific branches. The matrix is the executable shipped-inventory oracle, including version, kind, invocation source, entrypoint, profiles, capability, and members.

## 8. Compatibility and Authority

Unchanged by default:

- Core schema and normalized identity;
- bundled/project resolver precedence and invalid-project fail-closed behavior;
- Activation/Approval replay;
- Dispatch/Context/Result/Proposal lifecycle;
- Workflow completion versus transition separation;
- H1/H2 human authority;
- Quest single writer and source-admin refusal;
- managed capability registry.

New packages reuse these contracts. No runtime symbol changes are permitted unless focused tests expose an actual representation defect and GitNexus impact is reviewed first.

## 9. Failure and Rollback

Before product commit, rollback removes only new C8 task evidence, new package directories, and C8 inventory/test edits. Existing versions stay untouched.

After any recorded package use, never delete or mutate package bytes. Future disablement requires a forward policy/version change. Evaluation failures remain in `runs.jsonl`, `summary.json`, and `decision.md`; they are not erased to obtain a pass.
