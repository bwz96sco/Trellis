# V13-B attempt-2 implementation

## Steps

1. Wait for second accountable human (hard stop if unavailable).
2. P3: assignment/activation commit after separate auth.
3. P4: recompute all domains from P2 Git objects; write nine outputs; verdict pass or preserved fail.
4. Separate auth for assurance-output commit.

## Fail classification

- C0/authoring/candidate failure → new A/B siblings
- Reviewer-only failure → new B sibling against unchanged authoring input
