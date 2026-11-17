# T002 — home-bytes STOP diagnosis (orchestrator)

# command: node own-fetch.mjs <repo> <baseUrl> <outDir> block|noblock | base: B1 export (e17375b) vs T002 head export | chromium via tools/perf playwright | viewports 390x844 + 1440x900, load / until [data-site-live-state=revealed] + 2 s

- `index.html`, `index.txt` and every root `__next.*.txt` are byte-identical (home-bytes: 25/27 same).
- The one differing JS file (`18o_7-7eq6i8z.js` → `2kz0sk789ht_n.js`, 2,394 B both) is the project route's `WorkbenchLoader` chunk. It is referenced only by `projects/**` files, never by `/`'s own documents. `/` fetches it only because Next prefetches the project route from the home card link.
- Its only content change is the hashed name of the lazy workbench chunk, which carries the project sources (now with `relationships`).

## `/_next/static/**` fetched by `/`, base vs head

| mode | base files | head files | result |
|---|---:|---:|---|
| prefetch of `/projects*` blocked (`/`'s own loads; hero still reveals) | 15 | 15 | identical (sha256 below) |
| prefetch allowed | 16 | 16 | 1 file differs (the prefetched project-route loader) |

```
/_next/static/chunks/0-feshdmxxqft.js 7ccfdb534b83
/_next/static/chunks/00074u8z_q3cx.js a2d7852d9b7b
/_next/static/chunks/0jowprx3plh9c.js 9311430b7252
/_next/static/chunks/1c1n5uh1al8a6.js 62cd8bd27506
/_next/static/chunks/1mzpr2e_yf4k_.js 70941a6168f2
/_next/static/chunks/1x_7bfc20sw34.js 1a407a3f7c40
/_next/static/chunks/23ozcnd6hhypu.js 45f6828a3f4a
/_next/static/chunks/29p5wlfz_1l3v.js 247e7c0e7cdf
/_next/static/chunks/2e_so57tb_nr1.js 397d638b1128
/_next/static/chunks/3359ll6dl2j6z.js 8f40dd7eed16
/_next/static/chunks/335gqv7yiqdzh.js 32719e2ced84
/_next/static/chunks/3lgiu22xr8fof.js 4cb0c5775d6b
/_next/static/chunks/3ovppnf4srecq.css 61cf8986fdfd
/_next/static/chunks/3xl5otnp6lnep.js cfdf7dc277ec
/_next/static/chunks/turbopack-2u1d16houkiyo.js 439be7f075d6
```
