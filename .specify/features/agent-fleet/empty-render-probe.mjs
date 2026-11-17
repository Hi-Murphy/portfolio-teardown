#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '../../../tools/perf/node_modules/playwright/index.mjs';

const FEATURE_DIR = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = join(FEATURE_DIR, '../../content');
const WAIT_TIMEOUT_MS = 30_000;
const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: 'desktop', width: 1440, height: 900, isMobile: false, hasTouch: false },
];
const PALETTES = ['light', 'dark'];
const EMPTY_CONTAINER_SELECTOR = 'ul,ol,dl,div';

function usage() {
  console.error('usage: node empty-render-probe.mjs <baseUrl> --out <evidenceDir>');
  process.exit(2);
}

function parseArgs(argv) {
  let baseUrl;
  let outDir;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--out') {
      outDir = argv[index + 1];
      index += 1;
    } else if (argument.startsWith('--')) {
      usage();
    } else if (baseUrl === undefined) {
      baseUrl = argument;
    } else {
      usage();
    }
  }

  if (baseUrl === undefined || outDir === undefined) usage();

  let parsed;
  try {
    parsed = new URL(baseUrl);
  } catch {
    usage();
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') usage();
  if (!parsed.pathname.endsWith('/')) parsed.pathname += '/';

  return { baseUrl: parsed, outDir };
}

function compact(value) {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function siteUrl(baseUrl, path) {
  return new URL(path.replace(/^\//, ''), baseUrl).href;
}

function contextOptions(viewport, palette) {
  return {
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    isMobile: viewport.isMobile,
    hasTouch: viewport.hasTouch,
    colorScheme: palette,
  };
}

function zeroPanelCounts() {
  return {
    chips: 0,
    techHeadings: 0,
    linksHeadings: 0,
    targetAnchors: 0,
    hrs: 0,
    emptyContainers: 0,
  };
}

async function navigate(page, url) {
  const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
  if (response === null) throw new Error(`missing response for ${url}`);
  if (response.status() >= 400) throw new Error(`HTTP ${response.status()} for ${url}`);
  await page.locator('body').waitFor({ state: 'visible', timeout: WAIT_TIMEOUT_MS });
}

async function waitForHydration(page) {
  await page.locator('button[aria-label^="Switch to "]').waitFor({
    state: 'visible',
    timeout: WAIT_TIMEOUT_MS,
  });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}

async function cardCounts(page, slug) {
  return await page.evaluate(
    ({ cardSlug, emptySelector }) => {
      const normalize = (value) => (value ?? '').replace(/\s+/g, ' ').trim();
      const card = document.querySelector(`[data-site-card="${cardSlug}"]`);
      if (!(card instanceof HTMLElement)) {
        return {
          found: false,
          techLists: 0,
          techItems: 0,
          sourceLinks: 0,
          emptyContainers: 0,
        };
      }

      return {
        found: true,
        techLists: card.querySelectorAll('ul[aria-label="Tech"]').length,
        techItems: card.querySelectorAll('ul[aria-label="Tech"] > li').length,
        sourceLinks: [...card.querySelectorAll('a')].filter(
          (anchor) => normalize(anchor.textContent) === 'Source',
        ).length,
        emptyContainers: [...card.querySelectorAll(emptySelector)].filter(
          (element) => element.children.length === 0 && normalize(element.textContent) === '',
        ).length,
      };
    },
    { cardSlug: slug, emptySelector: EMPTY_CONTAINER_SELECTOR },
  );
}

async function routeCounts(page) {
  return await page.evaluate(() => ({
    projectLinks: document.querySelectorAll('ul[aria-label="Project links"]').length,
    connections: document.querySelectorAll('[data-site-connections]').length,
  }));
}

async function activateProjectViewer(page) {
  await waitForHydration(page);
  const control = page.locator('[data-site-control="explore-3d"]');
  await control.waitFor({ state: 'visible', timeout: WAIT_TIMEOUT_MS });
  await control.click({ timeout: WAIT_TIMEOUT_MS });
  await page.locator('[data-xploder-ready="true"]').waitFor({
    state: 'visible',
    timeout: WAIT_TIMEOUT_MS,
  });
  await page.waitForFunction(
    () => {
      const viewer = document.querySelector('[data-xploder-ready="true"]');
      return (
        viewer?.getAttribute('data-xploder-state') === 'exploded' &&
        viewer.getAttribute('data-xploder-tweening') === 'false'
      );
    },
    undefined,
    { timeout: WAIT_TIMEOUT_MS },
  );
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}

async function openComponentPanel(page, component) {
  const proxy = page.locator(`[data-xploder-proxy="${component.id}"]`).first();
  await proxy.waitFor({ state: 'attached', timeout: WAIT_TIMEOUT_MS });
  await proxy.click({ force: true, timeout: WAIT_TIMEOUT_MS });

  const handle = await page.waitForFunction(
    ({ name }) => {
      const normalize = (value) => (value ?? '').replace(/\s+/g, ' ').trim();
      return (
        [...document.querySelectorAll('[data-xploder-panel-surface]')].find((surface) => {
          if (surface.hasAttribute('data-xploder-panel-exiting')) return false;
          const heading = surface.querySelector('h2');
          return heading !== null && normalize(heading.textContent) === name;
        }) ?? false
      );
    },
    { name: component.name },
    { timeout: WAIT_TIMEOUT_MS },
  );
  const surface = handle.asElement();
  if (surface === null) throw new Error(`panel for ${component.id} did not attach`);
  await surface.evaluate(async () => {
    await document.fonts.ready;
  });

  return surface;
}

async function panelCounts(surface) {
  return await surface.evaluate((surfaceElement, emptySelector) => {
    const normalize = (value) => (value ?? '').replace(/\s+/g, ' ').trim();
    const headings = [...surfaceElement.querySelectorAll('h3')];

    return {
      chips: surfaceElement.querySelectorAll('[data-xploder-chip]').length,
      techHeadings: headings.filter((heading) => normalize(heading.textContent) === 'Tech').length,
      linksHeadings: headings.filter((heading) => normalize(heading.textContent) === 'Links')
        .length,
      targetAnchors: surfaceElement.querySelectorAll('a[target]').length,
      hrs: surfaceElement.querySelectorAll('hr').length,
      emptyContainers: [...surfaceElement.querySelectorAll(emptySelector)].filter(
        (element) => element.children.length === 0 && normalize(element.textContent) === '',
      ).length,
    };
  }, EMPTY_CONTAINER_SELECTOR);
}

async function closeComponentPanel(page, surface, component) {
  const close = await surface.$('[data-xploder-panel-close]');
  if (close === null) throw new Error(`panel for ${component.id} has no close button`);
  await close.click({ timeout: WAIT_TIMEOUT_MS });
  await page.waitForFunction(
    ({ name }) => {
      const normalize = (value) => (value ?? '').replace(/\s+/g, ' ').trim();
      return ![...document.querySelectorAll('[data-xploder-panel-surface]')].some((candidate) => {
        if (candidate.hasAttribute('data-xploder-panel-exiting')) return false;
        const heading = candidate.querySelector('h2');
        return heading !== null && normalize(heading.textContent) === name;
      });
    },
    { name: component.name },
    { timeout: WAIT_TIMEOUT_MS },
  );
}

function agentCell(viewport, palette, surface, counts, pass) {
  return { viewport: viewport.name, palette, surface, counts, pass };
}

function control(viewport, palette, surface, expected, actual, pass) {
  return { viewport: viewport.name, palette, surface, expected, actual, pass };
}

function printVerdict(entry) {
  const status = entry.pass ? 'PASS' : 'FAIL';
  console.log(
    `${entry.viewport} ${entry.palette} ${entry.surface} ${status} ${JSON.stringify(
      entry.counts ?? entry.actual,
    )}`,
  );
}

async function run() {
  const { baseUrl, outDir } = parseArgs(process.argv.slice(2));
  await mkdir(outDir, { recursive: true });

  const agentSource = JSON.parse(await readFile(join(CONTENT_DIR, 'agent-fleet.json'), 'utf8'));
  const jevSource = JSON.parse(await readFile(join(CONTENT_DIR, 'jev-toolkit.json'), 'utf8'));
  const agentComponents = agentSource.layers.flatMap((layer) => layer.components);
  const jevControlComponent = jevSource.layers
    .flatMap((layer) => layer.components)
    .find((component) => component.techs.length > 0);

  if (agentComponents.length !== 14) {
    throw new Error(`expected 14 agent-fleet components, received ${agentComponents.length}`);
  }
  if (jevControlComponent === undefined) {
    throw new Error('jev-toolkit has no component with techs');
  }

  const cells = [];
  const controls = [];
  const screenshots = [];
  const browser = await chromium.launch();

  try {
    for (const viewport of VIEWPORTS) {
      for (const palette of PALETTES) {
        const context = await browser.newContext(contextOptions(viewport, palette));

        try {
          const page = await context.newPage();

          for (const route of [
            { name: 'home', path: '/', agentSlug: 'agent-fleet', controlSlug: 'websocket-inspector' },
            { name: 'projects', path: '/projects', agentSlug: 'agent-fleet', controlSlug: 'jev-toolkit' },
            { name: '404', path: '/404.html', agentSlug: 'agent-fleet', controlSlug: 'websocket-inspector' },
          ]) {
            await navigate(page, siteUrl(baseUrl, route.path));
            await waitForHydration(page);

            const actual = await cardCounts(page, route.agentSlug);
            const expected = {
              techLists: 0,
              techItems: 0,
              sourceLinks: 0,
              emptyContainers: 0,
            };
            const counts = {
              techLists: actual.techLists,
              techItems: actual.techItems,
              sourceLinks: actual.sourceLinks,
              emptyContainers: actual.emptyContainers,
            };
            const cell = agentCell(
              viewport,
              palette,
              `${route.name}-agent-card`,
              counts,
              actual.found && Object.keys(expected).every((key) => counts[key] === expected[key]),
            );
            cells.push(cell);
            printVerdict(cell);

            if (route.name === 'home' || route.name === 'projects') {
              const card = page.locator('[data-site-card="agent-fleet"]');
              await card.waitFor({ state: 'visible', timeout: WAIT_TIMEOUT_MS });
              await card.scrollIntoViewIfNeeded();
              const screenshot = join(
                outDir,
                `T003-screenshot-card-${route.name}-${viewport.name}-${palette}.png`,
              );
              await card.screenshot({ path: screenshot });
              screenshots.push(screenshot);
            }

            const controlActual = await cardCounts(page, route.controlSlug);
            const controlExpected =
              route.name === 'projects'
                ? { techLists: 1, sourceLinks: 1, techItemsAtLeast: 1 }
                : { techListsAtLeast: 1, techItems: 4 };
            const controlPass =
              controlActual.found &&
              (route.name === 'projects'
                ? controlActual.techLists === 1 &&
                  controlActual.techItems >= 1 &&
                  controlActual.sourceLinks === 1
                : controlActual.techLists >= 1 && controlActual.techItems === 4);
            const controlEntry = control(
              viewport,
              palette,
              `${route.name}-${route.controlSlug}-control`,
              controlExpected,
              controlActual,
              controlPass,
            );
            controls.push(controlEntry);
            printVerdict(controlEntry);
          }

          await navigate(page, siteUrl(baseUrl, '/projects/agent-fleet'));
          const agentRoute = await routeCounts(page);
          const agentRouteCell = agentCell(
            viewport,
            palette,
            'agent-route-header',
            agentRoute,
            agentRoute.projectLinks === 0 && agentRoute.connections === 0,
          );
          cells.push(agentRouteCell);
          printVerdict(agentRouteCell);

          await navigate(page, siteUrl(baseUrl, '/projects/jev-toolkit'));
          const jevRoute = await routeCounts(page);
          const jevRouteControl = control(
            viewport,
            palette,
            'jev-route-header-control',
            { projectLinks: 1, connections: 1 },
            jevRoute,
            jevRoute.projectLinks === 1 && jevRoute.connections === 1,
          );
          controls.push(jevRouteControl);
          printVerdict(jevRouteControl);

          await navigate(page, siteUrl(baseUrl, '/projects/agent-fleet'));
          await activateProjectViewer(page);
          for (const component of agentComponents) {
            const surface = await openComponentPanel(page, component);
            const counts = await panelCounts(surface);
            const pass = Object.values(counts).every((value) => value === 0);
            const cell = agentCell(
              viewport,
              palette,
              `panel-${component.id}`,
              counts,
              pass,
            );
            cells.push(cell);
            printVerdict(cell);

            if (component.id === 'approval-gate' || component.id === 'orchestrator') {
              const screenshot = join(
                outDir,
                `T003-screenshot-panel-${component.id}-${viewport.name}-${palette}.png`,
              );
              await surface.screenshot({ path: screenshot });
              screenshots.push(screenshot);
            }

            await closeComponentPanel(page, surface, component);
            await surface.dispose();
          }

          await navigate(page, siteUrl(baseUrl, '/projects/jev-toolkit'));
          await activateProjectViewer(page);
          const controlSurface = await openComponentPanel(page, jevControlComponent);
          const jevPanelCounts = await panelCounts(controlSurface);
          const jevPanelControl = control(
            viewport,
            palette,
            'jev-panel-control',
            { chipsAtLeast: 1, techHeadings: 1 },
            jevPanelCounts,
            jevPanelCounts.chips > 0 && jevPanelCounts.techHeadings === 1,
          );
          controls.push(jevPanelControl);
          printVerdict(jevPanelControl);
          await closeComponentPanel(page, controlSurface, jevControlComponent);
          await controlSurface.dispose();
        } finally {
          await context.close();
        }
      }
    }
  } finally {
    await browser.close();
  }

  const uniqueScreenshots = [...new Set(screenshots)];
  const pass =
    cells.every((cell) => cell.pass) &&
    controls.every((entry) => entry.pass) &&
    uniqueScreenshots.length === 16;
  const report = { cells, controls, screenshots: uniqueScreenshots.length, pass };
  await writeFile(join(outDir, 'T003-log-empty-counts.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    `verdict ${pass ? 'PASS' : 'FAIL'} cells=${cells.length} controls=${controls.length} screenshots=${uniqueScreenshots.length}`,
  );
  if (!pass) process.exitCode = 1;
}

run().catch((error) => {
  const message = String(error?.stack ?? error)
    .replaceAll(process.cwd(), '<worktree>')
    .replaceAll(process.env.HOME ?? '', '<home>');
  console.error(`empty-render-probe failed: ${message}`);
  process.exitCode = 1;
});
