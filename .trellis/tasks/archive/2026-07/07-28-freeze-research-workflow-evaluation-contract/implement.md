# Implement — F01

## Preconditions

- [ ] Parent planning reviewed.
- [ ] Explicit F01 activation authorization received.
- [ ] `task.py start` for `07-28-freeze-research-workflow-evaluation-contract` only when authorized.
- [ ] Unrelated dirty paths in Trellis preserved (never stage/reset AGENTS.md, CLAUDE.md, docs-site, marketplace).

## Steps

1. Snapshot Trellis git HEAD and branch into notes (do not require clean Trellis tree).
2. Read-only inspect source: `git -C agent-skills-private rev-parse HEAD`, status, `registry/skills.txt`.
3. If source dirty or registry unreproducible → write stop report; do not invent clean baseline.
4. Build package list of 16 research-* from registry; hash SKILL.md and declared key files into `source-file-manifest.json` (paths+sha256 only).
5. Inventory Trellis Procedures under `packages/cli/src/templates/research/procedures/**` into baseline.
6. Write charter, privacy policy, rubric.yaml (parent weights), failure-taxonomy.yaml, blinding protocol, evidence-reference-schema.json.
7. Validate JSON/YAML parse; ensure no private body strings beyond approved short excerpt length policy (default: zero body excerpts at freeze).
8. Do not start F02 until F01 freeze accepted.

## Validation

```bash
python3 ./.trellis/scripts/task.py validate 07-28-freeze-research-workflow-evaluation-contract
# after freeze files exist:
python3 -c "import json,yaml,pathlib; p=pathlib.Path('.trellis/tasks/07-28-freeze-research-workflow-evaluation-contract/research');
[json.load(open(p/f)) for f in ['source-baseline.json','source-file-manifest.json','evidence-reference-schema.json']];
print('ok')"
```

Use `uv run python` only if YAML tooling is required via project scripts later.

## Rollback

Delete `research/` freeze files; task remains planning. No production changes.
