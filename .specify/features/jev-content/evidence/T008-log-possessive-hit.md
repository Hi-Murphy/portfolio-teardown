# T008 — deny-list hit in canonical websocket-inspector content (reported, not fixed)

**Hit.** The `possessive-jev` rule (`/\b(my|our)\s+JEV\b/i`, RFC/plan T-e) matches canonical content that predates S13:

- `.specify/content/websocket-inspector.json` → `story.outcome`: "… became the benchmark target for **my JEV decision-hook research** — …"
- the same string in `apps/web/content/projects/websocket-inspector.source.ts` (generated) and in 8 exported files under `apps/web/out/` (HTML + RSC of the routes that render it).

Every other T008 check passes: per-project hand-copy scan (both projects, negative controls incl. a planted jev-toolkit string), the JEV framing phrase verbatim in the generated source and the exported `/projects/jev-toolkit` page (not skipped), the `built-jev`, `jev-built-by` and `first-person-jev` rules with 0 hits, the canonical jev `story.approach` producing 0 hits, and the synthetic negative controls.

**Reading.** AC6: "the JEV third-party framing is rendered exactly as written (no "built JEV" claim anywhere)". "my JEV decision-hook research" claims the *research*, not JEV itself; it is not a "built JEV" claim. The `my|our JEV` rule was the orchestrator's broader proxy for ownership claims. The content is canonical: S13 may not edit it (kickoff Hard Rule 1), and the rule is not relaxed silently (Hard Rule 2) → escalated to Murphy.

## Resolution (Murphy, 2026-11-14: option B, "a")

Content-only commit **`fe73c52`** on `task/s13-jev-content`, made by the orchestrator at Murphy's explicit request: `story.outcome` now reads "… the benchmark target for **my research on JEV decision hooks** — fifteen refactor tasks across ten rule areas." One sentence, nothing else; re-converted in `291a804` (fidelity 13/13). `guards.sh` admits exactly that content commit (`FROZEN-OK` / `BRIEF-HISTORY-OK` fail on any other content change). The deny-list is unchanged and has **0 hits** in source and export (`T008-log-nothing-invented.txt`, 33/33). G14 note: `/projects/websocket-inspector` now differs from base `3b829d0` by exactly this sentence (authorised content change, not a behaviour change).
