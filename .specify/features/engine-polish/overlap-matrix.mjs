import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const [, , repoArg, baseUrlArg, screenshotArg] = process.argv;
if (!repoArg || !baseUrlArg) {
  console.error('usage: node overlap-matrix.mjs <repo> <baseUrl> [screenshotDir]');
  process.exit(2);
}

const repo = resolve(repoArg);
const baseUrl = baseUrlArg.replace(/\/$/, '');
const screenshotDir = screenshotArg === undefined ? null : resolve(screenshotArg);
const require = createRequire(resolve(repo, 'tools/perf/package.json'));
const { chromium } = require('playwright');
const browser = await chromium.launch();
const commit =
  process.env.S14_COMMIT ??
  execFileSync('git', ['-C', repo, 'rev-parse', '--short', 'HEAD'], {
    encoding: 'utf8',
  }).trim();

if (screenshotDir !== null) mkdirSync(screenshotDir, { recursive: true });

const geometry = () => {
  const visible = (element) => {
    const style = getComputedStyle(element);
    return (
      style.visibility !== 'hidden' &&
      style.display !== 'none' &&
      Number(style.opacity) > 0.01 &&
      element.getClientRects().length > 0
    );
  };
  const quad = (element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    if (style.transform === 'none') {
      return [
        [rect.left, rect.top],
        [rect.right, rect.top],
        [rect.right, rect.bottom],
        [rect.left, rect.bottom],
      ];
    }
    const matrix = new DOMMatrix(style.transform);
    const width = element.offsetWidth;
    const height = element.offsetHeight;
    const parent = element.offsetParent?.getBoundingClientRect() ?? { left: 0, top: 0 };
    const originX = parent.left + element.offsetLeft;
    const originY = parent.top + element.offsetTop;
    return [
      [0, 0],
      [width, 0],
      [width, height],
      [0, height],
    ].map(([x, y]) => {
      const point = matrix.transformPoint(new DOMPoint(x, y));
      return [originX + point.x, originY + point.y];
    });
  };
  const sat = (a, b) => {
    for (const polygon of [a, b]) {
      for (let index = 0; index < polygon.length; index += 1) {
        const [x1, y1] = polygon[index];
        const [x2, y2] = polygon[(index + 1) % polygon.length];
        const axisX = y1 - y2;
        const axisY = x2 - x1;
        const projectedA = a.map(([x, y]) => x * axisX + y * axisY);
        const projectedB = b.map(([x, y]) => x * axisX + y * axisY);
        if (
          Math.max(...projectedA) <= Math.min(...projectedB) ||
          Math.max(...projectedB) <= Math.min(...projectedA)
        ) {
          return false;
        }
      }
    }
    return true;
  };
  const nameElements = [
    ...document.querySelectorAll(
      '[data-xploder-lettering-layer-label],[data-xploder-label^="layer:"],[data-xploder-column-layer]',
    ),
  ].filter(visible);
  const names = nameElements.map((element) => ({
    id:
      element.getAttribute('data-xploder-lettering-layer-label') ??
      element.getAttribute('data-xploder-label') ??
      element.getAttribute('data-xploder-column-layer'),
    text: element.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    polygon: quad(element).map((point) => point.map(Math.round)),
  }));
  const overlay = [...document.querySelectorAll('[data-xploder-callouts]')].find(visible);
  const noteElement = [
    ...document.querySelectorAll('[data-xploder-label="dimension:stack"]'),
  ].find(visible);
  const note = noteElement === undefined ? null : quad(noteElement).map((point) => point.map(Math.round));
  const hits =
    note === null
      ? []
      : names.filter((name) => sat(note, name.polygon)).map((name) => ({
          id: name.id,
          polygon: name.polygon,
        }));

  return {
    callouts: overlay?.getAttribute('data-xploder-callouts') ?? 'hidden',
    note,
    names,
    hits,
  };
};

async function zoomFor(page) {
  return await page
    .locator('[data-xploder-ready="true"]')
    .first()
    .getAttribute('data-xploder-zoom');
}

const cells = [];

async function measureCell(page, route, width, height, scheme, band) {
  const geometryResult = await page.evaluate(geometry);
  const cell = {
    route,
    width: `${width}x${height}`,
    scheme,
    band,
    zoom: await zoomFor(page),
    ...geometryResult,
  };
  cells.push(cell);

  if (screenshotDir !== null && cell.hits.length > 0) {
    const slug =
      route === '/'
        ? 'home'
        : route.slice('/projects/'.length).replace(/[^a-z0-9-]/gi, '-');
    const name = `overlap-${slug}-${width}x${height}-${scheme}-${band}.png`;
    await page.screenshot({ path: resolve(screenshotDir, name) });
  }
}

console.log(
  `# command: node overlap-matrix.mjs <repo> <baseUrl> [screenshotDir] | base: ${baseUrl} | chromium: ${browser.version()} | commit: ${commit}`,
);

try {
  for (const [width, height, mobile] of [
    [1440, 900, false],
    [390, 844, true],
  ]) {
    for (const scheme of ['light', 'dark']) {
      for (const slug of ['websocket-inspector', 'jev-toolkit']) {
        const context = await browser.newContext({
          viewport: { width, height },
          isMobile: mobile,
          hasTouch: mobile,
          colorScheme: scheme,
        });
        const page = await context.newPage();
        const route = `/projects/${slug}`;

        try {
          await page.goto(`${baseUrl}${route}`);
          await page.locator('[data-site-control="explore-3d"]').click();
          await page.locator('[data-xploder-ready="true"]').waitFor({ state: 'visible' });
          await page.waitForTimeout(2500);

          for (const [band, presses] of [
            ['1x', 0],
            ['2x', 3],
            ['3x', 2],
          ]) {
            for (let index = 0; index < presses; index += 1) {
              await page.locator('[data-xploder-state]').first().focus();
              await page.keyboard.press('=');
              await page.waitForTimeout(150);
            }
            await page.waitForTimeout(1800);
            await measureCell(page, route, width, height, scheme, band);
          }
        } finally {
          await context.close();
        }
      }

      for (const [band, phase, offset] of [
        ['1x', 'explode', 300],
        ['hero-zoom', 'zoomin', 200],
      ]) {
        const context = await browser.newContext({
          viewport: { width, height },
          isMobile: mobile,
          hasTouch: mobile,
          colorScheme: scheme,
        });
        const page = await context.newPage();

        try {
          await page.goto(`${baseUrl}/`);
          await page.locator(`[data-hero-phase="${phase}"]`).waitFor({ timeout: 60_000 });
          await page.waitForTimeout(offset);
          await page.getByRole('button', { name: /pause/i }).click();
          await page.waitForTimeout(2500);
          await measureCell(page, '/', width, height, scheme, band);
        } finally {
          await context.close();
        }
      }
    }
  }

  console.log(
    '| route | width | scheme | band | zoom | callouts | note polygon | layer names | hits | hit names | hit polygons |',
  );
  console.log('|---|---:|---|---:|---:|---|---:|---:|---:|---|---|');
  for (const cell of cells) {
    const note = cell.note === null ? 'hidden' : JSON.stringify(cell.note);
    const hitNames = cell.hits.map((hit) => hit.id).join(', ') || '—';
    const hitPolygons =
      cell.hits.length === 0 ? '—' : JSON.stringify(cell.hits.map((hit) => hit.polygon));
    console.log(
      `| ${cell.route} | ${cell.width} | ${cell.scheme} | ${cell.band} | ${cell.zoom ?? 'missing'} | ${cell.callouts} | ${note} | ${cell.names.length} | ${cell.hits.length} | ${hitNames} | ${hitPolygons} |`,
    );
  }

  console.log('\n## Layer-name polygons\n');
  for (const cell of cells) {
    console.log(
      `### ${cell.route} | ${cell.width} | ${cell.scheme} | ${cell.band} | zoom ${cell.zoom ?? 'missing'}\n`,
    );
    if (cell.names.length === 0) {
      console.log('- none');
    } else {
      for (const name of cell.names) {
        console.log(`- \`${name.id ?? 'unnamed'}\` (${name.text || 'untitled'}): ${JSON.stringify(name.polygon)}`);
      }
    }
    console.log('');
  }

  const totalHits = cells.reduce((total, cell) => total + cell.hits.length, 0);
  console.log(`TOTAL HITS ${totalHits}`);
} finally {
  await browser.close();
}
