# Literature route disposition

## Frozen v1.2 intent

| Route | Capability | Default stage? |
|-------|------------|----------------|
| review | `research.literature.review` | **automatic/default** at cutover |
| scan | `research.literature.scan` | **non-default** explicit |
| survey | `research.literature.survey` / survey-v1 | **non-default** explicit optional |

## Implementation rule

P2-07 / P2-12 must not preserve any opposite accidental registry binding. At cutover:

1. Default literature stage capability resolves to **review**.
2. Scan remains available as explicit capability.
3. Survey is explicit optional (never default stage).

## Stop gate

If code cannot implement this without a methodology change, stop for reviewed **v1.3+** — do not silently invert v1.2.
