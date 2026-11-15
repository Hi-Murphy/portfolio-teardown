import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const [, , repoArg, baseUrlArg] = process.argv;
if (!repoArg || !baseUrlArg) {
  console.error('usage: node t008-screenshots.mjs <repo> <baseUrl>');
  process.exit(2);
}

const repo = resolve(repoArg);
const baseUrl = baseUrlArg.replace(/\/$/, '');
const outputDir = resolve(repo, '.specify/features/engine-polish/evidence');
const require = createRequire(resolve(repo, 'tools/perf/package.json'));
const { chromium } = require('playwright');
const browser = await chromium.launch();
const commit =
  process.env.S14_COMMIT ??
  execFileSync('git', ['-C', repo, 'rev-parse', '--short', 'HEAD'], {
    encoding: 'utf8',
  }).trim();

mkdirSync(outputDir, { recursive: true });

const shots = [
  ['websocket-inspector', 1440, 900, false, 'light', 3],
  ['websocket-inspector', 1440, 900, false, 'dark', 5],
  ['jev-toolkit', 1440, 900, false, 'light', 3],
  ['jev-toolkit', 1440, 900, false, 'dark', 5],
  ['websocket-inspector', 390, 844, true, 'light', 0],
  ['jev-toolkit', 390, 844, true, 'dark', 0],
  ['home', 1440, 900, false, 'light', null],
  ['home', 1440, 900, false, 'dark', null],
];

const bandFor = (presses) => {
  if (presses === null) return 'hero-zoom';
  if (presses === 0) return '1x';
  if (presses === 3) return '2x';
  if (presses === 5) return '3x';
  throw new Error(`unexpected press count: ${presses}`);
};

console.log(
  `# command: node t008-screenshots.mjs <repo> <baseUrl> | base: ${baseUrl} | chromium: ${browser.version()} | commit: ${commit}`,
);

try {
  for (const [routeName, width, height, mobile, scheme, presses] of shots) {
    const context = await browser.newContext({
      viewport: { width, height },
      isMobile: mobile,
      hasTouch: mobile,
      colorScheme: scheme,
    });
    const page = await context.newPage();

    try {
      if (routeName === 'home') {
        await page.goto(`${baseUrl}/`);
        await page.locator('[data-hero-phase="zoomin"]').waitFor({ timeout: 60_000 });
        await page.waitForTimeout(200);
        await page.getByRole('button', { name: /pause/i }).click();
        await page.waitForTimeout(2500);
      } else {
        await page.goto(`${baseUrl}/projects/${routeName}`);
        await page.locator('[data-site-control="explore-3d"]').click();
        await page.locator('[data-xploder-ready="true"]').waitFor({ state: 'visible' });
        await page.waitForTimeout(2500);
        for (let index = 0; index < presses; index += 1) {
          await page.locator('[data-xploder-state]').first().focus();
          await page.keyboard.press('=');
          await page.waitForTimeout(150);
        }
        await page.waitForTimeout(1800);
      }

      const band = bandFor(presses);
      const zoom = await page
        .locator('[data-xploder-ready="true"]')
        .first()
        .getAttribute('data-xploder-zoom');
      const name = `T008-screenshot-i05-${routeName}-${width}-${scheme}-${band}.png`;
      await page.screenshot({ path: resolve(outputDir, name) });
      console.log(`- ${name}: ${width}x${height}, ${scheme}, ${band}, zoom ${zoom ?? 'missing'}`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
