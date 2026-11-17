# G4 source map: agent-fleet teardown

**Content:** `.specify/content/agent-fleet.json` as amended by Merlin in `eda5c82` (RFC §12 R-K) · **Compiled by:** orchestrator (Opus 5.5), 2026-11-17 · **Format:** RFC §5.6

**Source types:**
- `repo`: a file in this repository (path and rule, readable by anyone).
- `ruleset`: a GitHub repository setting, read with `gh api`.
- `vault` / `config`: attested by Merlin and Murphy on 2026-11-17 in the S18 orchestrator session. Pointers are deliberately generic: no host, path, account or vendor detail.

**Kinds:** `number` = a figure; `fact` = a checkable statement about the fleet or the process; `design` = a stated intent or consequence that follows from a sourced fact (it carries no number).

**Result:** every `number` and `fact` row is SOURCED. No row is UNSOURCED. One false claim and two overstated claims were corrected in the content (`eda5c82`), and one unsourced sentence was deleted there (P1, "The fleet runs for weeks without attention…").

## Numbers

| # | JSON path | Claim | Source type | Source pointer | Value at source | Status |
|---|---|---|---|---|---|---|
| N1 | `story.metrics[0]`, `story.outcome` | 22 slice units shipped | repo | `.specify/slices` holds 22 frozen briefs (S01–S18, S11.5–S11.9 separate, no S09); counts S18, true at its merge (Gate 1 Q4) | 22 | SOURCED |
| N2 | `story.metrics[1]`, `story.outcome` | 15 revisions logged ("Fifteen revisions") | vault | revision log: 15 dated rows, coded by cause (7 criteria-wrong, 5 spec-gap, 3 scope-add) | 15 | SOURCED |
| N3 | `story.metrics[2]`, `story.outcome` | 7 required CI contexts ("Seven CI contexts") | ruleset | ruleset on `main`, required status checks (read 2026-11-17) | 7 | SOURCED |
| N4 | `story.metrics[3]`; `approval-gate.metrics[0]`; `meta.tagline` ("two human words"); `layers[0].description` ("two places") | 2 approval gates per slice | repo | `.specify/KICKOFF-S18.md`: Stage 1 ends at Murphy's Gate 1 reply; integration only after Murphy's final validation; brief "Murphy dependencies" (G1 + final merge word) | 2 | SOURCED |
| N5 | `story.metrics[4]`; `cron.metrics[0]`; `cron.summary` ("Twelve small clocks") | 12 scheduled jobs | config | scheduler table, 12 entries | 12 | SOURCED |
| N6 | `story.metrics[5]`; `meta.tagline` ("Two hosts"); `layers[3].description` ("Two machines") | 2 hosts | config | fleet inventory: one long-lived host, one hands-on host | 2 | SOURCED |
| N7 | `meta.year` | 2026 | repo | first commit of the repository (S01 foundation, `c7895bd`) dated 2026-10-28 | 2026 | SOURCED |
| N8 | `story.approach`; `implementer.description` ("two failures", "Two failed attempts") | escalation after 2 failures | repo | `.specify/KICKOFF-S18.md` hard rule 10 ("stuck ×2 → orchestrator") and the escalation section of every S18 `tasks.md` | 2 | SOURCED |
| N9 | `story.outcome` ("each through the same two gates") | every slice passed both gates | repo | each `.specify/KICKOFF-*.md` (22 files) defines the stage gates; every slice merge on `main` is a PR merged after Murphy's word | 2 per slice | SOURCED |

## Facts

| # | JSON path | Claim (verbatim excerpt) | Source type | Source pointer | Status |
|---|---|---|---|---|---|
| F1 | `meta.summary` | "An always-on fleet of agents that turns a written order into a reviewed slice, with a human at the plan and again at the merge." | config + repo | always-on: N6 long-lived host (config); plan + merge gates: N4 (repo) | SOURCED |
| F3 | `story.approach` | "Work arrives as an issue rather than a chat message, so it survives a lost session." | config | issue queue, each issue with a body (B4) | SOURCED |
| F4 | `story.approach`, `label-router.description`, `flows[0].description` | "A label decides which machine picks it up." | config | routing labels per issue (B5) | SOURCED |
| F5 | `story.approach`, `orchestrator.description`, `flows[0].description` | the orchestrator reads a frozen brief, decomposes it into tasks, dispatches and reviews; it does not implement | repo | `.specify/KICKOFF-S18.md` (audience = orchestrator seat; Stage 2 decomposition; Stage 3 dispatch) and `AGENTS.md` §4 (briefs frozen) | SOURCED |
| F6 | `story.approach`, `implementer.description`, `worktree.description` | one task at a time, each in its own throwaway checkout; runs the tests and reports | repo | `.specify/features/agent-fleet/tasks.md` "Worktrees" and "Format & rules" (fresh worktree per task, merged back, removed after merge) | SOURCED |
| F7 | `story.approach` | "Every task leaves evidence the orchestrator must read before the next one starts." | repo | kickoff contract: `.specify/EVIDENCE.md` + `.specify/KICKOFF-S18.md` hard rule 9; the orchestrator reviews each task before merging it (`tasks.md` "Worktrees") (Merlin D) | SOURCED |
| F8 | `story.approach`, `flows[1].description` | "Nothing merges on an agent's word: the plan and the merge each need an explicit human reply." | repo | N4 | SOURCED |
| F9 | `story.outcome` | "…coded by cause rather than by blame, and each one changed the brief or the template that produced the next slice." | vault | revision log, cause codes per row (corrected wording, `eda5c82`; Merlin B1) | SOURCED |
| F10 | `story.outcome` | "Seven CI contexts must pass before a merge is even offered." | ruleset | N3 | SOURCED |
| F11 | `chat-surface.description` | "A written request lands in a channel, not in a terminal. Threads keep the request, the links and the replies together…" | config | chat surface with one thread per slice (Merlin B2) | SOURCED |
| F12 | `approval-gate.description` | "The plan needs a human word before implementation starts, and the merge needs another before anything reaches the main branch." | repo | N4 | SOURCED |
| F13 | `review-thread.description` | "Each slice keeps one thread: the handoff, the verdict, any objection, and the evidence linked from it." | repo | slice threads hold handoff, verdict and objections; evidence lives in `.specify/features/*/evidence` and is linked (corrected wording, `eda5c82`; Merlin B3) | SOURCED |
| F14 | `issue-intake.description` | "Every request is written as an issue with a body: scope, acceptance, what not to touch." | config | issue queue with a body: scope, acceptance, exclusions (Merlin B4) | SOURCED |
| F15 | `dedup-state.description` | "Recurring jobs and repeated requests consult a small state file before they speak." | config | dedup state file, rolling window (Merlin B6) | SOURCED |
| F16 | `gate-check.description` | "When a criterion turns out to be unmeetable, the criterion is revised in daylight and logged with its cause." | vault + repo | revision log, 15 rows coded by cause (Merlin D); in this repo: S17 and S18 `evidence/REV1-revision-note.md` | SOURCED |
| F17 | `gate-check.description` | "Acceptance is a test result, not an opinion." / "never quietly reinterpreted" | repo | `AGENTS.md` §4 ("Acceptance criteria are never reworded or relaxed. A blocked criterion is escalated with evidence.") | SOURCED |
| F18 | `evidence.description` | "Logs, screenshots, measured numbers and a self-check that maps every acceptance criterion to the artefact that proves it." | repo | `.specify/EVIDENCE.md` §3; `.specify/features/cross-project/evidence/AC-selfcheck.md` | SOURCED |
| F19 | `edge-host.description` | "queue watchers, scheduled jobs, backups, and the agent that talks to the operator. It holds little state of its own — what matters lives in the vault and the queue." | config | host role in the fleet inventory (corrected wording, `eda5c82`; Merlin B7) | SOURCED |
| F20 | `workstation.description` | "holds the editor seats and does the heavy local builds" | config | second host: editor seats and local builds (Merlin B8) | SOURCED |
| F21 | `cron.description` | "digests, backups, health checks, capacity watchdogs. Each job carries its own time budget and is killed when it overruns" | config | scheduler entries carry a time budget and a kill (Merlin B9) | SOURCED |
| F22 | `flows[2].description`, `flows[2].label` ("Nightly upkeep") | "Scheduled jobs wake the edge host, spend their budget and exit; their results land where the next morning's digest can find them." | config | scheduled gather → digest chain (Merlin B10) | SOURCED |
| F23 | `issue-intake.description` | "a change of model behind the seat" | repo | seats are defined by role, not model, in every kickoff ("orchestrator seat", executor seat in `tasks.md`) | SOURCED |

## Design statements (no number, follow from a sourced fact)

| # | JSON path | Statement (excerpt) | Follows from |
|---|---|---|---|
| D1 | `story.headline`, `story.problem` | the question, and why sessions need a durable home | framing; no factual claim about the fleet |
| D2 | `story.problem` | "an operator at 1am" | illustrative; not a figure |
| D3 | `approval-gate.description` | "The gate is deliberate friction…" | N4 |
| D4 | `review-thread.description` | "A decision that only exists in a chat log is a rumour…" | F13 |
| D5 | `issue-intake.description` | "The issue is the unit that survives a lost session, a restarted host…" | F14 |
| D6 | `label-router.description` | "Routing is a declaration, not an inference…" | F4 |
| D7 | `dedup-state.description` | "Without it the fleet is a machine for saying the same thing twice…" | F15 |
| D8 | `orchestrator.description` | "the seat that plans is not the seat that types…" | F5 |
| D9 | `implementer.description` | "the cost of a wrong turn is bounded by design" | N8 |
| D10 | `worktree.description` | "Parallel work cannot collide… discarded by deleting a directory" | F6 |
| D11 | `evidence.description` | "it is done when the criterion has a file behind it" | F18 |
| D12 | `workstation.description` | "keeps interactive work from competing with always-on watchers" | N6, F19, F20 |
| D13 | `cron.description` | "an unattended job that can hang is a silent outage with a schedule" | F21 |
| D14 | `chat-surface.description` | "so the order can be read back weeks later by someone who was not there" | F11 (threads persist); a consequence, not an availability figure |
| D15 | layer descriptions, summaries, flow labels | short restatements of the rows above | N4, N6, F4–F22 |

`meta.role` ("Designer & operator") is the site owner's self-description, not a checkable fact about the fleet.
`meta.tags` (`orchestration`, `automation`, `reliability`) are topic labels, not claims.
