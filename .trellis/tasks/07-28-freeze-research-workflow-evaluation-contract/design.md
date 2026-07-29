# Design — F01 evaluation contract freeze

## Freeze package layout

```text
research/
  evaluation-charter.md              # purpose, scope, non-goals, authority of freeze
  source-baseline.json               # repo path, commit, dirty=false, registry list
  source-file-manifest.json          # relative paths + sha256 only
  evidence-privacy-policy.md         # allowed tracked content; private store rules
  evaluation-rubric.yaml             # dimensions, weights, 0-4 scale, hard gates
  failure-taxonomy.yaml              # source | validator | infrastructure classes
  reviewer-and-blinding-protocol.md  # roles, blinding, adjudication (1 round max)
  evidence-reference-schema.json     # SRC/VAL/FIX/RUN/REV schema
```

## source-baseline.json (conceptual fields)

- `evaluation_contract_version`
- `source_repo`, `source_commit`, `source_clean`
- `registry_path`, `packages` (16 ids)
- `trellis_repo`, `trellis_commit`, `trellis_branch`
- `procedure_inventory` [{id, version, path, instruction_sha256?}]
- `evaluator_harness` {tool, versions}
- `frozen_at`, `frozen_by`

## Hard stop conditions

1. `git status --porcelain` non-empty in source → stop.
2. Registry package set ≠ 16 research-* expected → stop and report delta.
3. Privacy policy cannot define private evidence directory rules → stop.
4. Cannot hash source files without reading into Trellis store of bodies → hash in memory/stream; persist path+hash only.

## Immutability

After freeze launch, do not edit files in place. Bump `evaluation_contract_version` and create a new freeze directory or versioned filenames if correction required. Downstream F02+ must cite the version they consume.
