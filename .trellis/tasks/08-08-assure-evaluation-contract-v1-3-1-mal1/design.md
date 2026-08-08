# v1.3.1 MAL-1 assurance design

## Isolation model

B131-0 binds a fresh reviewer identity, runtime class, author inequality, exact A131-1 subject, sanitized environment, owned paths, and false authority flags. The reviewer extracts the subject from Git and does not read an author worktree overlay or shared scratch as authority.

## Evidence model

The assurance script is part of the immutable B131-1 evidence set. It records deterministic command inputs and outputs in `execution-evidence-ledger.json`; every audit binds exact source/member identities and its own checks. `assurance-verdict.json` binds all other outputs by path, length, and SHA-256 and reduces to exact `pass` or `fail`.

## Independent oracle model

The accepted contract text and public/Trellis-native evidence are normative. The author generator may be used as an input producer but cannot be the only expectation oracle. The reviewer independently implements schema checks, predicates, mutation execution, applicability enumeration, and semantic-diff classification.

## Audit partition

- package/diff audit authenticates inputs and no-fifth-change discipline;
- report audit tests closed structural and digest semantics;
- validator audit executes every rule-specific fact contract;
- differential audit replays all global mutations and applicability predicates;
- family audit enumerates mapping totality and all lifecycle decisions;
- cross-leaf audit removes/contradicts authority and checks fail-closed behavior.

## Failure behavior

The runner continues through the mandatory corpus and records all failures. Missing output, runner crash, input drift, flake, ambiguity, or incomplete execution is a deterministic `fail`. No reviewer repair is permitted.

## Portability

Evidence uses relative POSIX paths, strict UTF-8 JSON, deterministic ordering, fixed digest domains, and no `.git` dependency inside portable output content except the initial exact-subject extraction step.

## Authority

A machine pass permits only a later separately authorized operator decision. It does not equal human review and cannot authorize technical work or activation.

## Reviewer identity and no-shared-scratch contract

B131-0 must bind concrete agent ID, session ID, runtime class, model class, assignment timestamp, author inequality, exact A131-1 commit/tree, clean `git archive` extraction path, and sanitized environment. A fork of the author session, shared author scratch, author worktree overlay, network/provider execution, candidate-path writes, or unverifiable identity inequality prevents B131-1 from starting.

Both pass and fail are authenticated assurance outcomes eligible for a later O131 input attestation. Acceptance remains pass-only; reject/stop may consume either outcome.
