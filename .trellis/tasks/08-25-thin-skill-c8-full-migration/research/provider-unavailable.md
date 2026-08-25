# C8 exact-model availability block

## Outcome

C8 live evaluation is blocked. The exact authorized model, `claude-sonnet-5`, was not routable through the installed Claude host.

All three `literature-01` arms returned:

```text
API Error: 400 unknown provider for model claude-sonnet-5
```

Each attempt was recorded as `nonretryable-failure` with `retryEligible: false`. No retry or model substitution was performed.

## Accounting

- Planned calls: 18
- Attempts recorded: 3
- Usable calls: 0
- Infrastructure retries: 0
- Calls not started: 15
- Hard cap: 24

Completed attempted slots:

- `literature-01/A`
- `literature-01/B`
- `literature-01/C`

Not started:

- `literature-02/A/B/C`
- `literature-03/A/B/C`
- `ideation-01/A/B/C`
- `ideation-02/A/B/C`
- `evaluation-01/A/B/C`

## Required stop

The approved contract says to stop when the exact model is unavailable and forbids silent substitution. Therefore:

- no retry is authorized for these results;
- no remaining provider call may start under this run;
- no case evaluation can open because no arm has a usable completion;
- the ten-package expansion remains blocked and unstarted;
- full migration cannot be claimed.

Canonical attempt identities and capture digests are recorded in `provider-unavailable.json` and `runs.jsonl`.
