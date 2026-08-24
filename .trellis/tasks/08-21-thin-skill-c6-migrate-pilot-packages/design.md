# C6 Pilot Package Design

## 1. Boundary

C6 is a packaging and distribution cutover, not a new execution architecture.

```text
C1 authenticated source bytes
  -> explicit semantic replacement map
  -> four schema-v3 packages
  -> existing lightweight/managed resolver
  -> existing Workflow/gate/Quest authority
```

No external source repository read is allowed during implementation.

## 2. Package Matrix

| Package | Kind | Invocation | Entrypoint | Profiles | Managed capability | Members |
|---|---|---|---|---|---|---|
| `research-literature@1.0.0` | bounded | model | model-context | lightweight, managed | `research.literature.review` | `templates/note-template.md` |
| `research-ideation@1.0.0` | bounded | model | model-context | lightweight, managed | `research.ideation.generate` | `templates/opportunity-board-template.md` |
| `research-idea-evaluation@1.0.0` | workflow | operator-explicit | model-context | managed | `research.ideation.evaluate` | `templates/attack-template.md` |
| `research-quest-admin@1.0.0` | admin | operator-explicit | root-command | none | none | none |

All declared template members are:

```json
{
  "role": "template",
  "load": "on-demand",
  "visibility": "worker-visible"
}
```

Their bytes remain identical to C1. Paths change only to the package-local `templates/` namespace.

## 3. Semantic Replacement Map

| Frozen source behavior | C6 representation |
|---|---|
| `agents/openai.yaml` host projection | `skill.json` invocation/profile/capability fields |
| `$research-*` host-native invocation | named package handoff with `autoInvoke: false`; root/operator performs separate action |
| repository-relative `scripts/validate-research-gates.py` | canonical `gate status/record` plus `workflow next/transition` commands |
| `h1_decision.md` / `h2_decision.md` as active decision source | canonical H1/H2 gate events; Markdown remains optional import/export evidence |
| one clean subagent per paper | lightweight one-paper/root execution; managed independent/parallel review only when selected |
| evaluation spawns one subagent per candidate | root prepares one separately approved managed invocation per candidate |
| source Quest writer/helper scripts | C4b Quest import/export/transfer-writer commands and committed writer projection |
| Quest-admin reference pack | existing Trellis command contracts/specs; not runtime Context |

The adapted `SKILL.md` files are new Trellis package instructions, not claimed byte-identical copies. C1 source digests and replacement rationale are recorded in task evidence.

## 4. Package Content

Production root:

```text
packages/cli/src/templates/research/skills/<id>/1.0.0/
```

Each package contains canonical one-line `skill.json` with final LF and adapted `SKILL.md`. Model-context packages include one exact frozen template.

No package includes:

- `agents/openai.yaml`;
- source Python gate validator;
- source Quest reader/writer scripts;
- host link/install metadata;
- registry-wide validation;
- heavy reports, manifests, campaign packs, or HTML output.

## 5. Evaluation Independence

`research.ideation.evaluate` retains `maxDispatches: 2`; C6 does not widen capability authority.

Independence is achieved across Activations:

```text
candidate C1 -> exact package Activation/Approval/worker Context -> attack Result
candidate C2 -> separate Activation/Approval/worker Context -> attack Result
...
root -> accepts attack Results -> records selected-or-blocked closure
```

Each worker sees only its candidate, parent question, approved literature refs, package instructions, and attack template. Worker cannot aggregate final canonical closure or launch another worker.

## 6. Packed Inventory

Current packed audit authenticates discovered schema-v3 packages but does not require any to exist. C6 adds a single immutable package declaration used to build required tar paths:

```text
skill.json
SKILL.md
all manifest-declared members
```

Audit then:

1. requires exact four package IDs/versions;
2. reads canonical manifest bytes from tar;
3. requires every declared member;
4. authenticates member digest/size;
5. rejects missing/extra invalid package state through existing package parser/auditor.

Do not reuse historical host-installed `RESEARCH_STAGE_SKILLS` inventory.

## 7. Test Contract

Required focused proofs:

- real bundled list/show/context sees exact four packages;
- model/operator/profile restrictions match matrix;
- optional members load only when requested;
- project-valid override wins and project-invalid blocks bundled fallback;
- lightweight/managed literature identity and instruction digest match;
- production evaluation package completes managed Context with exact attack template;
- Quest-admin model Context and Dispatch selection fail closed;
- packed source build and real tarball contain/authenticate exact packages;
- deleting any package/member fails packed audit;
- historical Procedure tests remain unchanged.

## 8. Rollback

Before any canonical managed use, rollback removes package directories and packed required inventory edits.

After recorded managed use, preserve package bytes and replay support. Disable future selection only through a forward package/capability policy change; never mutate or delete recorded package versions.
