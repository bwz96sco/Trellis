# Research Workflow-State Contract

## 1. Scope / Trigger

This specification covers active Research workflow selection, strict Research ledger-head reading, Claude SessionStart orientation, and the Claude/Codex per-turn sequence watermark.

The packaged CLI no longer generates or activates the generic Task breadcrumb runtime. Historical native workflow selection and schema-v1 Dispatch metadata remain readable only for compatibility; they do not activate generic scripts, Tasks, pull preludes, retired hosts, or marketplace/custom workflow switching.

## 2. Signatures

Workflow selection state:

```json
{
  "schemaVersion": 1,
  "id": "research",
  "source": "bundled"
}
```

Readable bundled IDs:

```text
research   active and resolvable
native     historical metadata only
```

Reserved session runtime field:

```json
{"research_last_seen_seq": 42}
```

Runtime path:

```text
.trellis/.runtime/sessions/<context-key>.json
```

Per-turn output when the canonical ledger head changes:

```text
<research-state-changed>...</research-state-changed>
```

## 3. Contracts

### Strict selection

- Selection parsing accepts only the exact schema-v1 object and exact bundled IDs.
- `research` is the only bundled workflow whose bytes may be resolved for active init/update.
- `native` remains readable historical metadata but has no active template resolver.
- Custom/marketplace sources, unknown IDs, unknown keys, wrong versions, and malformed JSON are invalid.
- Invalid selection blocks inference and preserves existing workflow bytes.
- Selection writes are atomic.

### Canonical sequence authority

- `.trellis/research/events.jsonl` is canonical.
- Missing or empty ledger means head `0`.
- Every non-empty line must be a JSON object with an integer, non-boolean `seq`.
- Sequence values must be contiguous from `1`; malformed JSON, non-object rows, duplicates, and gaps invalidate the read.
- Hooks read the head only. They never append events, repair projections, or skip malformed rows.

### SessionStart

Claude SessionStart may emit compact Research orientation for exact selected Research state:

- strict ledger head;
- compact active Quest pointers;
- compact pending Proposal pointers;
- one-shot first-reply guidance.

It does not emit generic Task phase breadcrumbs, developer/workspace/spec context, generic sub-agent routing, or active native/custom workflow behavior.

When identity and state are valid, SessionStart may atomically update only `research_last_seen_seq`. Unknown fields and false/zero/empty values survive. Malformed/non-object session JSON remains byte-identical.

### Per-turn watermark

The same Research sequence hook is generated for Claude and Codex.

- Equal stored watermark and ledger head: silent no-op and no write.
- Changed or missing stored watermark with valid state: emit one bounded change block and atomically update the watermark.
- Missing identity: silent no-op and no runtime file.
- Malformed selection, ledger, or session state: fail closed; preserve malformed bytes; do not advance the watermark.
- Root discovery may walk from a nested child repository to the Research control plane.

### Historical native workflow evidence

Historical native workflow bytes are recognized only by the 28 exact immutable SHA-256 rows with release and source-path provenance. There is no active native template dependency and no fuzzy content recognition. Successful managed migration always writes exact bundled Research bytes, verifies them, and then transfers hash/selection ownership.

### Removed breadcrumb runtime

`[workflow-state:STATUS]` blocks, active Task status writers, generic task scripts, retired host adapters, and pull-based generic preludes are not current packaged runtime contracts. Historical files may remain as preserved user data or migration evidence, but update/uninstall must not recreate or reinterpret them as active product state.

## 4. Validation & Error Matrix

| Condition | Required behavior |
|---|---|
| Exact Research selection and empty ledger | Valid head `0`. |
| Exact Research selection and changed contiguous head | Emit once; atomically store new sequence. |
| Stored sequence equals head | Empty output; no write. |
| Missing context identity | Empty output; no runtime file. |
| Malformed/non-object session JSON | Preserve bytes; no sequence output/write. |
| Malformed selection or ledger gap | Emit bounded validation guidance when supported; never advance state. |
| Historical exact native digest | Eligible for compatibility classification only. |
| Unknown or edited native-like bytes | User-owned/ambiguous; preserve. |
| Custom/marketplace selection | Invalid for active resolution; preserve bytes and perform no network lookup. |
| Generic Task breadcrumb marker exists in user content | Preserve as user/history data; do not activate a generated Task runtime. |

## 5. Good / Base / Bad Cases

- **Good**: Claude SessionStart reads Research head `12`, stores only `research_last_seen_seq: 12`, and the next prompt is silent until head `13`.
- **Base**: Research is selected but uninitialized; both hosts treat head `0` as valid and perform no unnecessary write.
- **Bad**: selecting `native` and loading a generic bundled template, skipping a malformed ledger row, overwriting malformed session JSON, or generating Task breadcrumb scripts because historical metadata exists.

## 6. Tests Required

- Strict selection parser matrix for exact `research`, historical `native`, malformed, unknown, and custom/marketplace values.
- Atomic selection write behavior.
- Native digest table integrity pinned to 28 rows, exact hash matching, and negative edited-byte cases.
- Strict zero/contiguous/gap/malformed ledger-head behavior.
- Claude/Codex changed/equal/missing-identity watermark behavior.
- Unknown-field and false/zero/empty-value preservation in valid session objects.
- Malformed session byte preservation.
- Nested child-repository root discovery.
- Negative package assertions for generic Task breadcrumb scripts, retired host adapters, and active native workflow templates.

## 7. Wrong vs Correct

```text
Wrong: `id: native` means resolve and install the old generic workflow.
Correct: `native` is readable metadata only; recognize historical bytes by immutable digest evidence and migrate only when ownership is proven.
```

```python
# Wrong: tolerate corruption and advance to a later row.
for line in ledger:
    try:
        head = json.loads(line)["seq"]
    except Exception:
        continue

# Correct: fail closed on the first malformed or non-contiguous row.
head = read_strict_research_head(ledger)
```

```text
Wrong: replace malformed session JSON with a new watermark object.
Correct: preserve malformed bytes and emit no state-changing output.
```
