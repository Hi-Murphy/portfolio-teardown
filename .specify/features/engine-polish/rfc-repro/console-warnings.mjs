// Capture console warnings per route (I-04 baseline): count of the THREE.Clock deprecation warning.
import { createRequire } from 'node:module';
const require = createRequire(process.argv[2] + '/tools/perf/package.json');
const { chromium } = require('playwright');
const base = process.argv[3] ?? 'http://127.0.0.1:4614';
const b = await chromium.launch();
for (const path of ['/', '/projects/websocket-inspector', '/projects/jev-toolkit']) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const warnings = [];
  p.on('console', (m) => { if (m.type() === 'warning') warnings.push(m.text()); });
  await p.goto(base + path);
  if (path !== '/') await p.locator('[data-site-control="explore-3d"]').click();
  await p.waitForSelector('[data-xploder-ready="true"]');
  await p.waitForTimeout(2000);
  const clock = warnings.filter((w) => w.includes('THREE.Clock'));
  console.log(path, 'canvases', await p.locator('canvas').count(), 'clockWarnings', clock.length, JSON.stringify(clock));
  await ctx.close();
}
await b.close();
