# S20 — Production cutover to `hi-murphy.me` — RUNBOOK (frozen)

**Type:** infrastructure runbook, **not a code slice.** No product code, no build changes. Owner per step is named; nothing here needs an agent to type code.
**Frozen:** 2026-11-18 · **depends on:** S19 ✅ `344f7e6` · **branch:** none required (docs only)

## State on 2026-11-18 (measured, not assumed)

| Fact | Value | Source |
|---|---|---|
| `hi-murphy.me` A | `43.156.128.125` — **this VPS**, nginx placeholder | `dig` |
| `www` | CNAME → apex, same IP | `dig` |
| Nameservers | ns23/ns24.domaincontrol.com (**GoDaddy**) | `dig` |
| MX / TXT / CAA | **none** — no mail on the domain, no CA restriction | `dig` |
| Served page | nginx 1.24.0, `Last-Modified` 2026-09-07, 5,574 B | `curl -I` |
| VPS vhost | `/etc/nginx/sites-available/hi-murphy.me`, root `/var/www/hi-murphy.me`, LE cert | local |
| Production target | Vercel project `portfolio-teardown`, currently `portfolio-teardown.vercel.app` | repo |

**Consequence:** the domain currently shows a *wrong* site. Cutover is not cosmetic — it replaces a misleading page.

## Steps

**C1 — Vercel: attach the domain (Murphy).**
Project → Settings → Domains → add `hi-murphy.me`, then add `www.hi-murphy.me` with **redirect to apex**. Record the exact DNS records Vercel displays — use those values, not values from memory.

**C2 — GoDaddy: repoint DNS (Murphy).**
- `A @` → replace `43.156.128.125` with the A record Vercel shows.
- `www` → replace the CNAME-to-apex with the CNAME Vercel shows.
- Touch nothing else. There is no MX to protect, so no email risk.
- Keep the old A value written down: it is the rollback.

**C3 — Verify propagation (Merlin).**
`dig +short hi-murphy.me A`, `dig +short www.hi-murphy.me`, `curl -sI https://hi-murphy.me`. Expect Vercel's edge headers, not `nginx`. Report the resolved values and the TTL wait.

**C4 — `SITE_URL` (Murphy).**
Vercel → Settings → Environment Variables → `SITE_URL=https://hi-murphy.me`, **Production only**, then **redeploy production**. Not Preview — previews must keep their own URL.

**C5 — Verify the real domain (Merlin).**
- `curl -s https://hi-murphy.me/projects/jev-toolkit | grep -E 'canonical|og:url|og:image|twitter:image'` → all `https://hi-murphy.me/...`
- `/sitemap.xml` → **5** `<loc>`, all on the apex
- `/robots.txt` → sitemap line on the apex, `/dev/` disallowed
- no `localhost`, no `*.vercel.app` anywhere in the HTML
- five routes 200; unknown slug 404; JSON-LD parses
- OG cards still 1200×630 and byte-identical between two builds

**C6 — Social caches (Murphy).**
LinkedIn Post Inspector and the X card validator on `/` and one project URL. One refresh each; the old previews will otherwise persist for weeks.

**C7 — Retire the VPS vhost (Murphy, optional but recommended).**
Once C5 is green: disable the nginx vhost, remove `/var/www/hi-murphy.me`, and stop certbot renewing a certificate for a host it no longer serves. Leaving it costs an expiring-cert mail every 60 days and a stale copy of the site on disk.

## Rollback
Two independent levels:
1. **Deployment rollback** — Vercel → Deployments → promote the previous one (seconds, no DNS).
2. **Domain rollback** — restore `A @ 43.156.128.125` at GoDaddy. The old site is still on disk until C7, so this works until cleanup. **Once C7 runs, level 2 is gone** — that is the reason C7 is last.

## Out of scope
- Round 2 accessories (free roam continues after cutover; no freeze needed).
- Résumé re-export, 404 project list, per-project lazy chunks, docs-only CI skip, evidence path scrub — all backlog.

## Done when
C5 green on the apex, C6 refreshed, and the vault records the cutover with the verified `dig` output and the five-route check.
