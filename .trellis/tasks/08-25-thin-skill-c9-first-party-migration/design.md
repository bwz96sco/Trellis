# C9 First-Party Migration Design

## 1. Forward boundary

C9 is a successor evaluation, not a correction of C8. C8 remains the authenticated predecessor at commit `715512230fee792377567c9cbba46319f2569c07` with `blocked-nonretryable-provider-failure` and zero usable calls.

C9 receives fresh identities for:

- evaluation ID;
- logical run IDs, attempt IDs, session IDs, and output roots;
- append-only ledger, summary, decision, and proof;
- provider authorization reference.

C9 reuses exact source, case, and accepted-package bytes copied from the committed C8 tree. A provenance manifest records each copied file digest and the predecessor commit. No C8 mutable working-tree bytes participate.

## 2. Evaluation materialization

C9 `research/` contains only reusable evaluation inputs and fresh outputs:

```text
research/
├── predecessor.json
├── build_source_baseline.py
├── source-baseline/**
├── case-sources/**
├── cases/**
├── evaluation-plan.json
├── migration-matrix.json
├── package-blueprints.{json,md}
├── pilot-semantic-alignment.{json,md}
├── run-record.schema.json
├── tools/{claude_runner.py,evaluation_harness.py}
├── tests/**
├── runs.jsonl
├── outputs/**
├── deterministic-proof.json
├── summary.json
└── decision.md
```

Reusable files are materialized from Git object `71551223...`; C8 provider-failure outputs, ledger, summary, and decision are excluded. C9 tests authenticate predecessor provenance and reject drift.

## 3. First-party process environment

`claude_runner.execute_process` receives an explicit child environment. It starts from the host environment, then removes routing and credential override keys before spawning Claude:

```text
ANTHROPIC_BASE_URL
ANTHROPIC_MODEL
ANTHROPIC_SMALL_FAST_MODEL
ANTHROPIC_DEFAULT_HAIKU_MODEL
ANTHROPIC_DEFAULT_SONNET_MODEL
ANTHROPIC_DEFAULT_OPUS_MODEL
ANTHROPIC_AUTH_TOKEN
ANTHROPIC_API_KEY
CLAUDE_CODE_USE_BEDROCK
CLAUDE_CODE_USE_VERTEX
CLAUDE_CODE_USE_FOUNDRY
```

This cleanup applies only to the child process. It does not modify the user's shell or config. The installed Claude Code OAuth session remains available through its normal credential store.

Before reserving any model attempt, C9 runs `claude auth status --json` under the same sanitized environment and accepts only:

```json
{
  "loggedIn": true,
  "authMethod": "claude.ai",
  "apiProvider": "firstParty"
}
```

Only these non-secret fields and their digest are recorded.

## 4. Provider execution and evidence

The runner command and result acceptance contract remain identical to C8 except for the sanitized environment. Reservation is appended before process launch. Each logical run owns one output root and isolated workspace. Every result captures exact stdout/stderr bytes, process metadata, model usage, and classification.

Retry remains legal only for a no-output infrastructure failure. Auth/model availability failures, substitution, usable output with nonzero exit, content failure, or evaluator failure are final for that logical run.

## 5. Evaluation gate

C9 runs six live cases across A/B/C. Evaluator input for one case opens only after all three arms are usable. Case evaluation records per-arm assertion statuses without weighted aggregate scores.

Gate pass requires:

- 18 usable planned calls;
- six completed live case evaluations;
- all applicable quality/overhead assertions pass;
- all nine zero-tolerance checks pass through live evaluations or deterministic proof;
- exact source/package identities remain stable;
- no provider/process/accounting violation.

A fail or provider block writes a terminal C9 decision and stops package work.

## 6. Package migration

After pass, each remaining source Skill maps to one immutable schema-v3 package using the C8 blueprint matrix. Package instructions preserve method and stop conditions while removing source-host projections and source-local orchestration. Members are copied only when required by the committed source method.

Both execution profiles resolve one package identity. Managed bindings use existing capability IDs only. Every handoff has `autoInvoke: false`. Root-command/native authority stays outside worker context.

## 7. Distribution and compatibility

One generalized bundled package inventory replaces pilot naming and enumerates all sixteen shipped package versions. The same inventory drives packed required entries and tests. Existing schema-v1/v2 Procedure history and the six existing package versions remain byte-identical.

## 8. Commit and archive shape

1. Commit C9 evaluation pass evidence and ten production packages/distribution coverage with normal hooks.
2. Mark/archive C9.
3. Mark C8 complete as a preserved blocked predecessor and archive it without changing its evaluation bytes.
4. Archive completed C1.
5. Complete/archive parent after every child is archived.
6. Record journal using product/evaluation commit hashes, excluding archive commits.

No push, PR, release, or publication.
