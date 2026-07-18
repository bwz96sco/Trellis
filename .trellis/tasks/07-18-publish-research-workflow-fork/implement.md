# Implementation — Publish Trellis research workflow fork

## Prepare

- [x] Recheck root HEAD/upstream/remotes/staging and submodule pins.
- [x] Confirm excluded and submodule-local dirty files remain present.
- [x] Confirm branch/fork names are unused.
- [x] Start this task and record branch.

## Root implementation commit

- [x] Create `variant/research-workflow` without stash/reset/clean.
- [x] Stage product paths through explicit allowlist.
- [x] Verify cached paths, forbidden paths, stat, and whitespace.
- [x] Run mandatory staged GitNexus change detection.
- [x] Run tests, lint, Python analysis, typecheck, and build.
- [x] Commit with required co-author trailer.

## Completed V1 task records

- [x] Stage only eight completed `07-17-*` research task directories.
- [x] Verify cached paths and whitespace.
- [x] Run mandatory staged GitNexus change detection.
- [x] Commit with required co-author trailer.

## Root-only limitation

- [x] Verify `.gitmodules` and gitlinks remain unchanged.
- [x] Verify committed template differs from official pinned marketplace blob.
- [x] Preserve docs/marketplace local edits uncommitted.

## Fork publication

- [x] Create only `bwz96sco/Trellis` public fork.
- [x] Rename official root remote to `upstream`; add fork as `origin`.
- [x] Push `variant/research-workflow` without force.
- [x] Set fork default branch to variant.
- [x] Verify local/remote hash and fork `main` mirror.

## Close

- [x] Mark task acceptance criteria complete.
- [x] Finish task.
- [x] Stage only this task directory.
- [x] Run mandatory staged GitNexus detection and diff checks.
- [x] Commit task record with co-author trailer.
- [x] Push final metadata commit.
- [x] Verify remote/default branch, exclusions, submodules, and no extra GitHub artifacts.
