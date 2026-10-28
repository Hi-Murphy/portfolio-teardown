# Portfolio Teardown Constitution

## Core Principles

### I. Brief Is Scope

The frozen slice brief is the complete scope for a task, and its acceptance criteria are never
reworded or relaxed. Revisions are logged with a reason code: `spec-gap`, `criteria-wrong`,
`unplanned-dependency`, or `implementer-error`. This keeps reviews comparable and prevents silent
scope drift.

### II. Static-Only Shell

Every deployable build is a static export, with no server runtime, API routes, or database.
Analytics are excluded because they add client cost and a data surface the product does not need.
This keeps the site portable, fast, and simple to host.

### III. Performance Is a Feature

The design target is a mid-range Android device on a 4G connection. Lighthouse mobile scores must
meet or exceed 95 for Performance and 95 for Accessibility as the baseline. Webfonts and client
JavaScript are excluded unless a documented need justifies their cost. Performance is a product
constraint because the primary experience must remain usable on the target device.

### IV. Single Motion Source

`xploder/motion` is the only source of durations, easings, and staggers. Application and library
code imports `motion` or its token groups from that entry point and never deep-imports `xploder/src`.
Literal motion values and CSS transition timings are prohibited outside the token module. A single
source makes motion consistent and lets later work tune it in one place.

### V. Theme Integrity

The default theme is light, and the first render follows the operating system preference when no
override exists. An inline head script plus a `prefers-color-scheme` CSS fallback prevent a flash of
the wrong theme. Returning the toggle to the OS value clears the stored override. Theme state must
be correct before paint, not corrected after hydration.

### VI. Evidence Over Assertion

Every visual or performance claim includes a screenshot, log, or report in the feature's `evidence/`
directory. Claims without evidence are treated as unverified, regardless of how plausible they look.
Evidence makes each acceptance decision reproducible and auditable.

### VII. No Secrets, Sanitized Content

No secrets, tokens, credentials, private IP addresses, private hostnames, or private repository
names enter code, comments, fixtures, evidence, or commits. Content must be sanitized before it is
committed, and environment files remain git-ignored. This protects users, infrastructure, and the
public history of the project.

## Constraints

The stack is locked to Next.js App Router with static generation, React Three Fiber with drei, GSAP,
Tailwind CSS, zod, and pnpm workspaces. The layout is `apps/web` for the site and `packages/xploder`
for the renderer library. Dependency additions outside this stack require an explicit decision.

## Workflow

Work proceeds through stage gates: RFC, then spec/plan/tasks, then execution. Murphy approves each
gate before the next begins. Each task covers one integration seam and has one executable check that
determines completion.

## Governance

This constitution supersedes ad-hoc practice. Amendments are proposed by pull request, include a
semantic-version bump, and take effect after review and approval. All work must verify compliance
with these principles before merging.

**Version**: 1.0.0 | **Ratified**: 2026-10-28 | **Last Amended**: 2026-10-28
