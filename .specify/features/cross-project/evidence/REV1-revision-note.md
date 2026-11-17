# S17 — brief revision 1 of 2 (note for Merlin)

**Date:** 2026-11-17 · **Decided by:** Murphy (in the orchestrator session) · **Counter:** 1 of 2 used

## What conflicted

- Brief Scope 1/2: `relationships` lives **in each project JSON** (`.specify/content/<slug>.json`).
- AC6: CI green and **S2–S8 empty**.
- Five xploder tests read `.specify/content/<slug>.json` directly and parse it with the strict library schema (`z.strictObject` at the root, sealed in S2). Four of them are sealed (S6 `label-pass-parity`, `label-sweep`, `overlay-note-clear`; S7 `lettering-obstacles`); the fifth is `overlay-place-equivalence`. Any new top-level key fails them (`T002v1-log-xploder-suite-fail.txt`).

## Decision

Each project's relationships move to a **sibling content file**: `.specify/content/relationships/<slug>.json`, `{ "relationships": [...] }`. The entries and both notes are unchanged and verbatim. The project JSON files stay byte-identical.

## What did not change

- AC1–AC6, word for word.
- The two notes, the `kind` vocabulary, the strip, its position, and the no-chip-links decision.
- Two-way and explicit: both entries are written in content, nothing is mirrored.

## Also recorded (not a revision)

- **C2:** the AC4 byte check compares `/`'s own files. Files that the browser prefetches for the project routes are listed separately (`rfc.md` §11).
- **U1:** Next.js 16.4.3 → 16.4.6 security upgrade, done in S17 at Murphy's request. The AC4/AC5 baseline is the upgrade commit (R1).
