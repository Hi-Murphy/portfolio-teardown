import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = resolve(process.argv[2] ?? '');
const exportDir = resolve(process.argv[3] ?? '');
const outDir = resolve(process.argv[4] ?? '');
const prefix = process.argv[5] ?? 'T001';

if (!process.argv[2] || !process.argv[3] || !process.argv[4]) {
  console.error('Usage: node baseline-shots.mjs <repoRoot> <exportDir> <outDir> [prefix]');
  process.exitCode = 2;
} else {
  const { serveDir } = await import(
    pathToFileURL(join(repoRoot, 'tools/perf/src/serve.ts')).href
  );
  const { siteSource } = await import(
    pathToFileURL(join(repoRoot, 'apps/web/content/site.source.ts')).href
  );
  const require = createRequire(join(repoRoot, 'tools/perf/package.json'));
  const { chromium } = require('playwright');

  mkdirSync(outDir, { recursive: true });
  const server = await serveDir(exportDir);
  const base = server.url.origin;
  const browser = await chromium.launch();

  try {
    const results = {};

    for (const [width, height] of [
      [390, 844],
      [768, 1024],
      [1440, 900],
    ]) {
      for (const scheme of ['light', 'dark']) {
        const context = await browser.newContext({
          viewport: { width, height },
          colorScheme: scheme,
          reducedMotion: 'reduce',
          deviceScaleFactor: 1,
        });
        const page = await context.newPage();
        await page.goto(`${base}/`, { waitUntil: 'load' });
        await page.waitForTimeout(800);

        const measurements = await page.evaluate((identityName) => {
          const box = (element) => {
            if (!element) return null;
            const rect = element.getBoundingClientRect();
            return {
              x: Math.round(rect.x),
              y: Math.round(rect.y + scrollY),
              w: Math.round(rect.width),
              h: Math.round(rect.height),
              bottom: Math.round(rect.bottom + scrollY),
            };
          };
          const visible = (element) =>
            !!element &&
            element.getClientRects().length > 0 &&
            getComputedStyle(element).visibility !== 'hidden' &&
            !element.closest('.sr-only');
          const query = (selector) => document.querySelector(selector);
          const name = [...document.querySelectorAll('body *')].find(
            (element) =>
              element.children.length === 0 &&
              element.textContent.trim().includes(identityName) &&
              visible(element) &&
              element.getBoundingClientRect().width > 1,
          );
          const regions = [
            ...document.querySelectorAll('body > div > header, main section, main > div > div, footer'),
          ].map((element) => ({
            tag: element.tagName.toLowerCase(),
            id: element.id || null,
            label: element.getAttribute('aria-labelledby'),
            box: box(element),
          }));
          const headings = [...document.querySelectorAll('h1,h2,h3,h4')].map(
            (element) => `${element.tagName}:${element.textContent.trim().slice(0, 40)}`,
          );
          const smallTargets = [...document.querySelectorAll('a,button')]
            .filter(visible)
            .map((element) => ({
              text: (
                element.textContent.trim() ||
                element.getAttribute('aria-label') ||
                ''
              ).slice(0, 30),
              rect: element.getBoundingClientRect(),
            }))
            .filter((target) => target.rect.width > 1 && target.rect.height < 44)
            .map(
              (target) =>
                `${target.text} ${Math.round(target.rect.width)}x${Math.round(target.rect.height)}`,
            );

          return {
            docHeight: document.documentElement.scrollHeight,
            hScroll:
              document.documentElement.scrollWidth > document.documentElement.clientWidth,
            visibleName: name ? { text: name.textContent.trim(), box: box(name) } : null,
            eyebrow: box(query('[data-site-hero] p')),
            h1: box(query('h1')),
            subline: box(query('[data-site-hero] h1 + p')),
            primaryCta: box(query('[data-site-hero] a')),
            figure: box(query('[data-site-hero] figure')),
            caption: box(query('#hero-caption')),
            firstCard: box(query('[data-site-card]')),
            liveMode:
              query('[data-site-live-mode]')?.getAttribute('data-site-live-mode') ?? null,
            regions,
            headings,
            smallTargets,
          };
        }, siteSource.identity.name);

        results[`${width}x${height}-${scheme}`] = measurements;
        await page.screenshot({
          path: join(outDir, `${prefix}-screenshot-baseline-${width}-${scheme}.png`),
          fullPage: true,
        });
        if (width === 390) {
          await page.screenshot({
            path: join(
              outDir,
              `${prefix}-screenshot-baseline-390x844-fold-${scheme}.png`,
            ),
          });
        }
        await context.close();
      }
    }

    writeFileSync(
      join(outDir, `${prefix}-log-baseline-boxes.json`),
      JSON.stringify(results, null, 2),
    );
    console.log(JSON.stringify(results['390x844-light'], null, 1));
    console.log(
      JSON.stringify(
        Object.fromEntries(
          Object.entries(results).map(([key, value]) => [
            key,
            {
              docHeight: value.docHeight,
              hScroll: value.hScroll,
              h1: value.h1,
              cta: value.primaryCta,
              fig: value.figure,
              card: value.firstCard,
            },
          ]),
        ),
      ),
    );
  } finally {
    await browser.close();
    await server.close();
  }
}
