import { createRequire } from 'node:module';
const require = createRequire(process.cwd() + '/tools/perf/package.json');
const { chromium } = require('playwright');
const url = process.argv[2];
const b = await chromium.launch();
for (const delay of [500, 2500, 4500, 6500, 8500, 10500, 12500, 14500, 16500, 18500, 20500, 22500]) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(url); await p.waitForSelector('[data-hero-loop="running"]', { timeout: 30000 }); await p.waitForTimeout(delay);
  const phase = await p.locator('[data-hero-phase]').first().getAttribute('data-hero-phase').catch(() => null);
  await p.getByRole('button', { name: 'Pause animation', exact: true }).click();
  const hero = p.locator('[data-home-section="hero"]'); const t0 = Date.now();
  const shots = [];
  for (const at of [500, 1500, 3500, 6000]) { await p.waitForTimeout(Math.max(0, at - (Date.now() - t0))); shots.push(await hero.screenshot()); }
  const lastChange = [1, 2, 3].filter((i) => !shots[i].equals(shots[i - 1])).map((i) => [500, 1500, 3500, 6000][i]);
  console.log(`pause at +${delay}ms phase=${phase} changes after pause at: ${lastChange.join(',') || 'none'}`);
  await p.close();
}
await b.close();
