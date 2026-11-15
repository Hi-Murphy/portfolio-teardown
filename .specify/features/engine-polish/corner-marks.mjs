import { execFileSync } from 'node:child_process';
import http from 'node:http';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const STALL_MS = 600;
const MARKER = 'data-hero-annotation';

const [, , repoArg, baseArg, viewportArg] = process.argv;
if (!repoArg || !baseArg || !viewportArg) {
  console.error('usage: node corner-marks.mjs <repo> <baseUrl> <viewports e.g. 390x844,390x740>');
  process.exit(2);
}

const repo = resolve(repoArg);
const baseUrl = baseArg.replace(/\/$/, '');
const viewports = viewportArg.split(',').map((item) => {
  const match = /^(\d+)x(\d+)$/.exec(item.trim());
  if (match === null) throw new Error(`invalid viewport: ${item}`);
  return { width: Number(match[1]), height: Number(match[2]) };
});

async function startStallProxy(upstreamBase) {
  let markerFound = false;
  const server = http.createServer(async (request, response) => {
    try {
      const target = new URL(request.url ?? '/', upstreamBase);
      const upstream = await fetch(target);
      const body = Buffer.from(await upstream.arrayBuffer());
      const headers = Object.fromEntries(
        [...upstream.headers].filter(
          ([key]) => !['content-length', 'content-encoding', 'transfer-encoding'].includes(key),
        ),
      );
      response.writeHead(upstream.status, headers);

      if (target.pathname === '/') {
        const html = body.toString('utf8');
        const index = html.indexOf(MARKER);
        if (index >= 0) {
          markerFound = true;
          response.write(html.slice(0, index));
          setTimeout(() => response.end(html.slice(index)), STALL_MS);
          return;
        }
      }

      response.end(body);
    } catch (error) {
      response.writeHead(502, { 'content-type': 'text/plain' });
      response.end(error instanceof Error ? error.message : String(error));
    }
  });

  await new Promise((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolveListen);
  });
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('proxy did not bind');

  return {
    url: `http://127.0.0.1:${address.port}`,
    markerFound: () => markerFound,
    close: () => new Promise((resolveClose) => server.close(resolveClose)),
  };
}

const require = createRequire(resolve(repo, 'tools/perf/package.json'));
const { chromium } = require('playwright');
const browser = await chromium.launch();
const proxy = await startStallProxy(baseUrl);
const commit =
  process.env.S14_COMMIT ??
  execFileSync('git', ['-C', repo, 'rev-parse', '--short', 'HEAD'], {
    encoding: 'utf8',
  }).trim();

function formatBox(box) {
  return `${box.x.toFixed(2)},${box.y.toFixed(2)},${box.width.toFixed(2)},${box.height.toFixed(2)}`;
}

function sameBox(a, b) {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

console.log(
  `# command: node corner-marks.mjs <repo> <baseUrl> <viewports> | base: ${baseUrl} | chromium: ${browser.version()} | commit: ${commit}`,
);

let allIdentical = true;
let totalShifts = 0;

try {
  for (const viewport of viewports) {
    for (const mode of ['stalled', 'direct']) {
      const context = await browser.newContext({
        viewport,
        isMobile: true,
        hasTouch: true,
        colorScheme: 'dark',
      });
      const page = await context.newPage();

      try {
        await page.addInitScript(() => {
          const state = { first: null, shifts: [] };
          window.__s14CornerMarks = state;
          new PerformanceObserver((list) => {
            state.shifts.push(...list.getEntries().map((entry) => entry.toJSON()));
          }).observe({ type: 'layout-shift', buffered: true });

          const sample = () => {
            if (state.first !== null) return;
            const hero = document.querySelector('[data-site-hero]');
            if (hero !== null) {
              const panels = [...hero.querySelectorAll(':scope > [aria-hidden="true"]')];
              for (const panel of panels) {
                const marks = [...panel.children].filter(
                  (element) =>
                    element instanceof HTMLSpanElement &&
                    element.classList.contains('h-[18px]') &&
                    element.classList.contains('w-[18px]'),
                );
                if (marks.length === 4) {
                  state.first = marks.map((mark) => {
                    const rect = mark.getBoundingClientRect();
                    return {
                      x: rect.x,
                      y: rect.y,
                      width: rect.width,
                      height: rect.height,
                    };
                  });
                  return;
                }
              }
            }
            requestAnimationFrame(sample);
          };
          requestAnimationFrame(sample);
        });

        await page.goto(mode === 'stalled' ? `${proxy.url}/` : `${baseUrl}/`);
        await page.waitForFunction(
          () => {
            const live = document.querySelector('[data-site-live]');
            const state = live?.getAttribute('data-site-live-state');
            return (
              state === 'skipped' ||
              (state === 'revealed' &&
                document.querySelector('[data-hero-loop-slot] button') !== null)
            );
          },
          undefined,
          { timeout: 60_000 },
        );
        await page.evaluate(async () => {
          await document.fonts.ready;
          await new Promise((resolveFrame) => requestAnimationFrame(resolveFrame));
          await new Promise((resolveFrame) => requestAnimationFrame(resolveFrame));
        });

        const result = await page.evaluate(() => {
          const hero = document.querySelector('[data-site-hero]');
          const panels =
            hero === null ? [] : [...hero.querySelectorAll(':scope > [aria-hidden="true"]')];
          let marks = [];
          for (const panel of panels) {
            marks = [...panel.children].filter(
              (element) =>
                element instanceof HTMLSpanElement &&
                element.classList.contains('h-[18px]') &&
                element.classList.contains('w-[18px]'),
            );
            if (marks.length === 4) break;
          }
          return {
            first: window.__s14CornerMarks.first,
            after: marks.map((mark) => {
              const rect = mark.getBoundingClientRect();
              return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
            }),
            shifts: window.__s14CornerMarks.shifts.length,
          };
        });

        if (result.first === null || result.after.length !== 4) {
          throw new Error(`${viewport.width}x${viewport.height} ${mode}: crop marks missing`);
        }

        const labels = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
        console.log(`## ${viewport.width}x${viewport.height} ${mode}\n`);
        console.log('| mark | first paint x,y,w,h | after reveal x,y,w,h | identical |');
        console.log('|---|---|---|---|');
        let cellIdentical = true;
        for (let index = 0; index < 4; index += 1) {
          const identical = sameBox(result.first[index], result.after[index]);
          if (!identical) {
            cellIdentical = false;
            allIdentical = false;
          }
          console.log(
            `| ${labels[index]} | ${formatBox(result.first[index])} | ${formatBox(result.after[index])} | ${identical ? 'yes' : 'no'} |`,
          );
        }
        totalShifts += result.shifts;
        console.log(`\nLayout-shift entries: ${result.shifts}\n`);
        if (!cellIdentical) console.log('Cell verdict: FAIL\n');
      } finally {
        await context.close();
      }
    }
  }

  if (!proxy.markerFound()) throw new Error(`stall marker not found: ${MARKER}`);
} finally {
  await browser.close();
  await proxy.close();
}

console.log(`VERDICT ${allIdentical && totalShifts === 0 ? 'PASS' : 'FAIL'}`);
