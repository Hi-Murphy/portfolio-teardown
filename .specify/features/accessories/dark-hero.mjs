// S19 X1: the live JEV hero in dark theme. Zero interaction, then pause/play by click.
// Screenshots the hero model at each storyboard phase and checks the canvas is lit.
// usage: node dark-hero.mjs <repo> <baseUrl> <outDir>
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const [, , repoArg, baseUrlArg, outArg] = process.argv;
if (!repoArg || !baseUrlArg || !outArg) {
  console.error('usage: node dark-hero.mjs <repo> <baseUrl> <outDir>');
  process.exit(2);
}

const require = createRequire(resolve(repoArg, 'tools/perf/package.json'));
const { chromium } = require('playwright');
const baseUrl = baseUrlArg.replace(/\/$/, '');
const outDir = resolve(outArg);
await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();
const PHASES = ['implode', 'explode', 'zoomin', 'capture', 'inspect', 'turn'];
let failed = false;

console.log(`# dark-hero | base ${baseUrl} | chromium ${browser.version()}`);
console.log('| viewport | check | result |');
console.log('|---|---|---|');

for (const [width, height, mobile] of [
  [1440, 900, false],
  [390, 844, true],
]) {
  const vp = `${width}x${height}`;
  const context = await browser.newContext({
    viewport: { width, height },
    colorScheme: 'dark',
    isMobile: mobile,
    hasTouch: mobile,
  });
  const page = await context.newPage();
  const row = (check, pass, detail) => {
    if (!pass) failed = true;
    console.log(`| ${vp} | ${check} | ${pass ? 'PASS' : 'FAIL'} ${detail} |`);
  };

  await page.goto(`${baseUrl}/`, { waitUntil: 'load' });
  const theme = await page.evaluate(() => document.documentElement.className);
  row('html theme class', theme.includes('dark'), `class="${theme}"`);

  await page.waitForSelector('[data-site-live-state="revealed"]', { timeout: 15000 });
  row('live hero revealed without interaction', true, 'data-site-live-state=revealed');

  const model = page.locator('[data-hero-model]');
  for (const phase of PHASES) {
    await page.waitForSelector(`[data-hero-phase="${phase}"]`, { timeout: 60000 });
    await page.waitForTimeout(phase === 'implode' ? 300 : 1200);
    const shot = await model.screenshot();
    await writeFile(resolve(outDir, `dark-hero-${vp}-${phase}.png`), shot);
    // Lit = the screenshot of the model shows strokes brighter than the dark paper. (A WebGL canvas
    // without preserveDrawingBuffer reads back blank, so the PNG is measured, not the canvas.)
    const lit = await page.evaluate(async (src) => {
      const image = new Image();
      image.src = src;
      await image.decode();
      const probe = document.createElement('canvas');
      probe.width = 128;
      probe.height = 128;
      const ctx = probe.getContext('2d');
      ctx.drawImage(image, 0, 0, 128, 128);
      const data = ctx.getImageData(0, 0, 128, 128).data;
      let bright = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] + data[i + 1] + data[i + 2] > 300) bright += 1;
      }
      return { canvas: document.querySelector('[data-hero-model] canvas') !== null, bright };
    }, `data:image/png;base64,${shot.toString('base64')}`);
    row(`phase ${phase} drawn`, lit.canvas && lit.bright > 0, `${lit.bright}/16384 bright px`);
  }

  const button = page.locator('[data-hero-loop-slot] button');
  const loopAttr = () =>
    page.evaluate(() => document.querySelector('[data-hero-loop]')?.getAttribute('data-hero-loop'));
  await button.click();
  await page.waitForTimeout(500);
  const paused = await loopAttr();
  const label = await button.getAttribute('aria-label');
  row('pause by click', paused === 'paused', `data-hero-loop=${paused}, label="${label}"`);
  await button.click();
  await page.waitForTimeout(500);
  const resumed = await loopAttr();
  row('play by click', resumed === 'running', `data-hero-loop=${resumed}`);

  await context.close();
}

await browser.close();
console.log(failed ? 'dark-hero: FAIL' : 'dark-hero: PASS');
process.exitCode = failed ? 6 : 0;
