# Pilot Source Inventory

## Authenticated source state

```text
repository: /Users/zhangbowen/Projects/agent-skills-private
branch: chore/retire-find-skills
base HEAD: e2b0d70e3a797f19461eb106601de12250000b69
upstream: none configured
relevant staged changes: none
```

All included inputs are regular mode-`100644` files. No included symlink was found.

## Exact included inventory

Deduplicated total: 19 files.

### `research-literature`

- `skills/research-literature/SKILL.md`
- `skills/research-literature/agents/openai.yaml`
- `skills/research-literature/note-template.md`

`SKILL.md` supplies `note-template.md` to paper-reading subagents. Agent projection preserves invocation metadata.

### `research-ideation`

- `skills/research-ideation/SKILL.md`
- `skills/research-ideation/agents/openai.yaml`
- `skills/research-ideation/opportunity-board-template.md`
- `scripts/validate-research-gates.py`

`SKILL.md` names the opportunity-board template and shared H1/H2 validator.

### `research-idea-evaluation`

- `skills/research-idea-evaluation/SKILL.md`
- `skills/research-idea-evaluation/agents/openai.yaml`
- `skills/research-idea-evaluation/attack-template.md`
- `scripts/validate-research-gates.py` (shared; stored once)

`SKILL.md` supplies the attack template and invokes the shared H2/closure validator.

### `research-quest`

- `skills/research-quest/SKILL.md`
- `skills/research-quest/agents/openai.yaml`
- `skills/research-quest/scripts/research_quest.py`

The helper owns read-only status and validation behavior.

### `research-quest-admin`

- `skills/research-quest-admin/SKILL.md`
- `skills/research-quest-admin/agents/openai.yaml`
- `skills/research-quest-admin/references/quest-pack.md`
- `skills/research-quest-admin/references/campaign-index.md`
- `skills/research-quest-admin/references/task-forest-bridge.md`
- `skills/research-quest-admin/scripts/research_quest_admin.py`
- `skills/research-quest/scripts/research_quest.py` (shared; stored once)

All three references are conditionally linked from the admin skill. Admin helper dynamically imports the read helper using the exact sibling package layout.

## Working-tree overlay inside included inventory

Tracked modified, unstaged:

- `skills/research-literature/SKILL.md`
- `skills/research-ideation/SKILL.md`
- `scripts/validate-research-gates.py`

Untracked:

- `skills/research-ideation/opportunity-board-template.md`

Other included files are tracked and clean. Snapshot therefore records the commit as base identity while authenticating all 19 working-tree byte streams independently.

## Runtime artifacts, not source-baseline members

H1 consumes:

- `opportunity_board.md`
- `h1_decision.md`
- optional structured `opportunity-index.md`
- optional structured `problem-checkpoint.md`

H2 additionally consumes:

- `ideas.md`
- `h2_decision.md`

Closure additionally consumes:

- `attacks/*.md`
- `decision.md`

These are project runtime artifacts. They are not source package files and are not copied into the baseline.

## Explicit exclusions

Dirty but outside pilot runtime inputs:

- `README.md`
- `scripts/audit-installed-links.sh`
- `scripts/install-links.sh`
- `scripts/manage-external-specialists.py`
- `tests/test_manage_external_specialists.py`
- `registry/source-io-contracts.md`
- `scripts/validate-research-skills.py`
- `evals/research-skills/test_research_skill_contracts.py`
- `evals/research-skills/test_research_gates.py`

Reason: README, host-link, external-specialist, registry-wide validation, and test-only surfaces are not direct runtime dependencies.

Dirty non-pilot producer/successor work:

- `skills/research-opportunity-mining/SKILL.md`
- `skills/research-opportunity-mining/opportunity-template.md`
- `scripts/validate-research-opportunities.py`
- `evals/research-skills/test_research_opportunities.py`
- `skills/research-synthesis/SKILL.md`
- `skills/research-synthesis/problem-checkpoint-template.md`

Reason: they produce schemas consumed semantically by structured H1, but they are not named pilot packages and are not invoked by the frozen validator.

Relevant-looking unreferenced admin examples:

- `skills/research-quest-admin/templates/research-quest.yaml`
- `skills/research-quest-admin/templates/research-event.json`

Reason: no pilot instruction, reference, or helper directly names these files; admin helper constructs equivalent values programmatically.

## Dependency risks carried forward

1. Required `opportunity-board-template.md` is untracked; snapshot must retain its exact bytes.
2. Gate validator is repository-relative; migrated packages must package it or resolve a deterministic installed location.
3. Quest admin helper assumes exact sibling layout with `research-quest` read helper.
4. Structured H1 semantics consume producer schemas from excluded opportunity-mining/synthesis work; later compatibility tests must detect drift.
5. H2 and closure have no dedicated templates; contracts live in instruction prose plus validator code.
6. Unreferenced admin templates remain excluded under direct-dependency rule and must not silently re-enter C6.
