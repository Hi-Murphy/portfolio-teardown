import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [repoArg, baseUrlArg, outDirArg] = process.argv.slice(2);
if (repoArg === undefined || baseUrlArg === undefined || outDirArg === undefined) {
  console.error('usage: node i09-browser.mjs <repo> <baseUrl> <outDir>');
  process.exit(2);
}

const repo = resolve(repoArg);
const baseUrl = new URL(baseUrlArg);
const outDir = resolve(outDirArg);
const require = createRequire(join(repo, 'tools/perf/package.json'));
const { chromium } = require('playwright');
const { decodePng } = await import(pathToFileURL(join(repo, 'tools/perf/src/png.ts')).href);

await mkdir(outDir, { recursive: true });

const commit = execFileSync('git', ['-C', repo, 'rev-parse', 'HEAD'], {
  encoding: 'utf8',
}).trim();
const command = ['node', ...process.argv.slice(1)].join(' ');
const target = new URL('/projects/websocket-inspector', baseUrl).href;
const lines = [];
const failures = [];
let chromiumVersion = 'unavailable';

function emit(line) {
  lines.push(line);
  console.log(line);
}

function channelDiff(left, right) {
  return left.map((value, index) => Math.abs(value - right[index]));
}

function maxDifference(left, right) {
  return Math.max(...channelDiff(left, right));
}

function insideVisibleStage(rect, stage, viewport) {
  const tolerance = 0.5;
  const left = Math.max(0, stage.left);
  const top = Math.max(0, stage.top);
  const right = Math.min(viewport.width, stage.right);
  const bottom = Math.min(viewport.height, stage.bottom);
  return (
    rect.width > 1 &&
    rect.height > 1 &&
    rect.left >= left - tolerance &&
    rect.top >= top - tolerance &&
    rect.right <= right + tolerance &&
    rect.bottom <= bottom + tolerance
  );
}

function overlaps(rect, other) {
  return (
    rect.right > other.left + 0.5 &&
    rect.left < other.right - 0.5 &&
    rect.bottom > other.top + 0.5 &&
    rect.top < other.bottom - 0.5
  );
}

function center(rect) {
  return [Math.round(rect.left + rect.width / 2), Math.round(rect.top + rect.height / 2)];
}

async function readGeometry(page, viewport) {
  const geometry = await page.evaluate(() => {
    const box = (element) => {
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      };
    };
    const stage = document.querySelector('[data-xploder-stage]');
    const panel = document.querySelector('[data-xploder-panel-surface]');
    return {
      stage: stage === null ? null : box(stage),
      panel: panel === null ? null : box(panel),
      panelDock: panel?.getAttribute('data-xploder-panel-dock') ?? null,
      proxies: [...document.querySelectorAll('[data-xploder-proxy]')].map((element, index) => ({
        index,
        id: element.getAttribute('data-xploder-proxy'),
        rect: box(element),
      })),
    };
  });

  const valid = geometry.proxies.filter(
    (proxy) =>
      proxy.id !== null &&
      geometry.stage !== null &&
      insideVisibleStage(proxy.rect, geometry.stage, viewport) &&
      (geometry.panel === null || !overlaps(proxy.rect, geometry.panel)),
  );
  return { ...geometry, valid };
}

async function readAttributes(page) {
  return await page.evaluate(() => {
    const wrapper = document.querySelector('[data-xploder-state]');
    return {
      highlight: wrapper?.getAttribute('data-xploder-highlight') ?? null,
      selected: wrapper?.getAttribute('data-xploder-selected') ?? null,
    };
  });
}

async function resetPointer(page) {
  await page.mouse.move(5, 5);
  await page.waitForTimeout(300);
}

async function closePanel(page) {
  if ((await readAttributes(page)).selected === null) return;
  await page.keyboard.press('Escape');
  await page.waitForFunction(
    () => !document.querySelector('[data-xploder-state]')?.hasAttribute('data-xploder-selected'),
    undefined,
    { timeout: 5000 },
  );
  await resetPointer(page);
}

function samplePatch(image, [x, y]) {
  if (x < 2 || y < 2 || x >= image.width - 2 || y >= image.height - 2) {
    throw new Error(`sample centre ${x},${y} is outside ${image.width}x${image.height}`);
  }
  const channels = [0, 0, 0];
  let count = 0;
  for (let sampleY = y - 2; sampleY <= y + 2; sampleY += 1) {
    for (let sampleX = x - 2; sampleX <= x + 2; sampleX += 1) {
      const offset = (sampleY * image.width + sampleX) * 4;
      channels[0] += image.data[offset] ?? 0;
      channels[1] += image.data[offset + 1] ?? 0;
      channels[2] += image.data[offset + 2] ?? 0;
      count += 1;
    }
  }
  return channels.map((value) => Math.round(value / count));
}

function colourLine(name, value) {
  return `${name}=[${value.join(',')}]`;
}

async function chooseHoverTarget(page, geometry, selectedId, referenceColour) {
  const ordered = [...geometry.valid].sort((left, right) => {
    const score = (proxy) => (proxy.index === 5 ? 0 : proxy.index === 7 ? 1 : proxy.index === 3 ? 2 : 3);
    return score(left) - score(right) || left.index - right.index;
  });

  let closest;
  for (const candidate of ordered) {
    if (candidate.id === selectedId) continue;
    const point = center(candidate.rect);
    await page.mouse.move(...point);
    await page.waitForTimeout(500);
    const attributes = await readAttributes(page);
    if (attributes.highlight !== candidate.id) continue;

    const image = decodePng(await page.screenshot());
    const colour = samplePatch(image, point);
    const difference = channelDiff(referenceColour, colour);
    const maximum = Math.max(...difference);
    const result = { candidate, point, attributes, colour, difference, maximum };
    if (closest === undefined || maximum < closest.maximum) closest = result;
    if (maximum <= 6) return result;
  }
  if (closest !== undefined) return closest;
  throw new Error(`no visible proxy accepts hover after opening ${selectedId}`);
}

async function openValidPair(page, viewport) {
  const before = await readGeometry(page, viewport);
  const preferred = [...before.proxies]
    .filter((proxy) => proxy.id !== null && before.valid.some((valid) => valid.id === proxy.id))
    .sort((left, right) => {
      const score = (proxy) => (proxy.index === 3 ? 0 : proxy.index === 0 ? 1 : 2);
      return score(left) - score(right) || left.index - right.index;
    });

  for (const opener of preferred) {
    const openerPoint = center(opener.rect);
    await resetPointer(page);
    await page.mouse.move(...openerPoint);
    await page.mouse.click(...openerPoint);
    await page.waitForTimeout(600);
    const opened = await readAttributes(page);
    if (opened.selected !== opener.id) {
      await closePanel(page);
      continue;
    }

    const after = await readGeometry(page, viewport);
    const openerAfter = after.valid.find((proxy) => proxy.id === opener.id);
    if (openerAfter !== undefined && after.valid.length >= 3) {
      return { a: openerAfter, geometry: after };
    }

    await closePanel(page);
  }

  throw new Error('no A/B/C proxy set remains fully visible and clear of the open panel');
}

async function runScenario(browser, viewportName, viewport, palette) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
    colorScheme: palette,
  });
  try {
    const page = await context.newPage();
    await page.goto(target, { waitUntil: 'load', timeout: 30000 });
    await page.locator('[data-site-control="explore-3d"]').click();
    await page.waitForSelector('[data-xploder-ready="true"]', { timeout: 30000 });
    await page.waitForTimeout(2500);

    const { a, geometry } = await openValidPair(page, viewport);
    const aPoint = center(a.rect);
    const referenceImage = decodePng(await page.screenshot());
    const referenceColour = samplePatch(referenceImage, aPoint);
    const hover = await chooseHoverTarget(page, geometry, a.id, referenceColour);
    const b = hover.candidate;
    const c = geometry.valid.find((proxy) => proxy.id !== a.id && proxy.id !== b.id);
    if (c === undefined) throw new Error(`no non-emphasised component C after opening ${a.id}`);
    const bPoint = center(b.rect);
    const cPoint = center(c.rect);
    const hoverPoint = center(hover.candidate.rect);

    const hoverName = `T003-screenshot-i09-${viewportName}-${palette}-hover-b.png`;
    const hoverPath = join(outDir, hoverName);
    const hoverBuffer = await page.screenshot({ path: hoverPath });
    const hoverImage = decodePng(hoverBuffer);
    if (hoverImage.width !== viewport.width || hoverImage.height !== viewport.height) {
      throw new Error(`hover screenshot is ${hoverImage.width}x${hoverImage.height}`);
    }
    const hoverColours = {
      a: samplePatch(hoverImage, aPoint),
      b: samplePatch(hoverImage, bPoint),
      c: samplePatch(hoverImage, cPoint),
    };

    await page.mouse.move(5, 5);
    await page.waitForTimeout(500);
    const leftAttributes = await readAttributes(page);
    const leftName = `T003-screenshot-i09-${viewportName}-${palette}-left-b.png`;
    const leftPath = join(outDir, leftName);
    const leftBuffer = await page.screenshot({ path: leftPath });
    const leftImage = decodePng(leftBuffer);
    if (leftImage.width !== viewport.width || leftImage.height !== viewport.height) {
      throw new Error(`left screenshot is ${leftImage.width}x${leftImage.height}`);
    }
    const leftColours = {
      a: samplePatch(leftImage, aPoint),
      b: samplePatch(leftImage, bPoint),
      c: samplePatch(leftImage, cPoint),
    };

    const prefix = `${viewportName} ${palette}`;
    const ids = `A=${a.id} B=${b.id} C=${c.id} panel=${geometry.panelDock ?? 'none'}`;
    emit(
      `${prefix} hover-b ${ids} attrs=${JSON.stringify(hover.attributes)} ${colourLine('A', hoverColours.a)} ${colourLine('B', hoverColours.b)} ${colourLine('C', hoverColours.c)} |A-B|=[${channelDiff(hoverColours.a, hoverColours.b).join(',')}] |A-C|=[${channelDiff(hoverColours.a, hoverColours.c).join(',')}]`,
    );
    emit(
      `${prefix} left-b ${ids} attrs=${JSON.stringify(leftAttributes)} ${colourLine('A', leftColours.a)} ${colourLine('B', leftColours.b)} ${colourLine('C', leftColours.c)} A-vs-hover-A=[${channelDiff(leftColours.a, hoverColours.a).join(',')}]`,
    );

    if (hover.attributes.highlight !== b.id) {
      failures.push(`${prefix} hover-b highlight=${hover.attributes.highlight} expected ${b.id}`);
    }
    if (hover.attributes.selected !== a.id) {
      failures.push(`${prefix} hover-b selected=${hover.attributes.selected} expected ${a.id}`);
    }
    if (leftAttributes.selected !== a.id) {
      failures.push(`${prefix} left-b selected=${leftAttributes.selected} expected ${a.id}`);
    }
    if (maxDifference(hoverColours.a, hoverColours.b) > 6) {
      failures.push(
        `${prefix} hover A/B colour delta ${maxDifference(hoverColours.a, hoverColours.b)} > 6`,
      );
    }
    if (maxDifference(hoverColours.a, leftColours.a) > 6) {
      failures.push(
        `${prefix} left A colour delta ${maxDifference(hoverColours.a, leftColours.a)} > 6`,
      );
    }

    if (hoverPoint[0] !== bPoint[0] || hoverPoint[1] !== bPoint[1]) {
      failures.push(`${prefix} hover target differs from measured B centre`);
    }
  } finally {
    await context.close();
  }
}

let browser;
try {
  browser = await chromium.launch({ channel: 'chromium', headless: true });
  chromiumVersion = browser.version();
  emit(
    `# command=${command} target=${target} chromium=${chromiumVersion} commit=${commit}`,
  );

  const scenarios = [
    ['desktop', { width: 1440, height: 900 }],
    ['mobile', { width: 390, height: 844 }],
  ];
  for (const [viewportName, viewport] of scenarios) {
    for (const palette of ['light', 'dark']) {
      try {
        await runScenario(browser, viewportName, viewport, palette);
      } catch (error) {
        failures.push(`${viewportName} ${palette}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
} catch (error) {
  failures.push(error instanceof Error ? error.message : String(error));
} finally {
  await browser?.close();
}

if (lines.length === 0) {
  emit(
    `# command=${command} target=${target} chromium=${chromiumVersion} commit=${commit}`,
  );
}
const verdict =
  failures.length === 0 ? 'VERDICT PASS' : `VERDICT FAIL reasons=${failures.join('; ')}`;
emit(verdict);
await writeFile(join(outDir, 'T003-log-i09-browser.txt'), `${lines.join('\n')}\n`, 'utf8');
process.exitCode = failures.length === 0 ? 0 : 1;
