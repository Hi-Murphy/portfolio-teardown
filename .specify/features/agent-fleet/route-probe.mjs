#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '../../../tools/perf/node_modules/playwright/index.mjs';

const FEATURE_DIR = dirname(fileURLToPath(import.meta.url));
const CONTENT_PATH = join(FEATURE_DIR, '../../content/agent-fleet.json');
const EXPECTED_COUNTS = { layers: 4, components: 14, flows: 3 };
const WAIT_TIMEOUT_MS = 30_000;
const TOUR_TIMEOUT_MS = 60_000;
const LIVE_LAYERS_PANEL_SELECTOR =
  '[data-site-explore-live] > [data-site-explore] [data-site-layers-panel]';
const LIVE_LAYER_CHIP_SELECTOR =
  '[data-site-explore-live] > [data-site-explore] [data-site-layer-chip]';
const LIVE_LAYER_PARTS_SELECTOR =
  '[data-site-explore-live] > [data-site-explore] [data-site-layer-parts] li';
const LIVE_FLOWS_PANEL_SELECTOR =
  '[data-site-explore-live] > [data-site-explore] [data-site-explore-panel="flows"]';

function usage() {
  console.error('usage: node route-probe.mjs <routeUrl> --out <evidenceDir>');
  process.exit(2);
}

function parseArgs(argv) {
  let routeUrl;
  let outDir;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--out') {
      outDir = argv[index + 1];
      index += 1;
    } else if (argument.startsWith('--')) {
      usage();
    } else if (routeUrl === undefined) {
      routeUrl = argument;
    } else {
      usage();
    }
  }

  if (routeUrl === undefined || outDir === undefined) usage();

  let parsed;
  try {
    parsed = new URL(routeUrl);
  } catch {
    usage();
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') usage();

  return { routeUrl: parsed, outDir };
}

function normalize(value) {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function sameSet(left, right) {
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return (
    sortedLeft.length === sortedRight.length &&
    sortedLeft.every((value, index) => value === sortedRight[index])
  );
}

function sameSequence(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function printCheck(name, pass, detail = '') {
  console.log(`${name} ${pass ? 'PASS' : 'FAIL'}${detail === '' ? '' : ` ${detail}`}`);
}

async function waitForHydration(page) {
  await page.locator('button[aria-label^="Switch to "]').waitFor({
    state: 'visible',
    timeout: WAIT_TIMEOUT_MS,
  });
}

async function waitForViewerReady(page) {
  await page.locator('[data-xploder-ready="true"]').waitFor({
    state: 'visible',
    timeout: WAIT_TIMEOUT_MS,
  });
  await page.evaluate(async () => {
    await document.fonts.ready;
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
}

async function activateProjectViewer(page) {
  await waitForHydration(page);
  const control = page.locator('[data-site-control="explore-3d"]');
  await control.waitFor({ state: 'visible', timeout: WAIT_TIMEOUT_MS });
  await control.click({ timeout: WAIT_TIMEOUT_MS });
  await waitForViewerReady(page);
}

async function layerCounts(page) {
  await page.getByRole('tab', { name: 'Layers', exact: true }).click({
    timeout: WAIT_TIMEOUT_MS,
  });
  await page.locator(LIVE_LAYERS_PANEL_SELECTOR).waitFor({
    state: 'visible',
    timeout: WAIT_TIMEOUT_MS,
  });

  const layers = await page.locator(LIVE_LAYER_CHIP_SELECTOR).count();
  let components = 0;

  for (let index = 0; index < layers; index += 1) {
    await page.locator(LIVE_LAYER_CHIP_SELECTOR).nth(index).click({
      timeout: WAIT_TIMEOUT_MS,
    });
    await page.waitForFunction(
      (selector) => document.querySelectorAll(selector).length > 0,
      LIVE_LAYER_PARTS_SELECTOR,
      { timeout: WAIT_TIMEOUT_MS },
    );
    components += await page.locator(LIVE_LAYER_PARTS_SELECTOR).count();
  }

  return { layers, components };
}

async function flowOptionIds(page) {
  await page.getByRole('tab', { name: 'Flows', exact: true }).click({
    timeout: WAIT_TIMEOUT_MS,
  });
  await page.locator(LIVE_FLOWS_PANEL_SELECTOR).waitFor({
    state: 'visible',
    timeout: WAIT_TIMEOUT_MS,
  });

  return await page.evaluate(() =>
    [...document.querySelectorAll('[data-site-tour-flow-option]')]
      .map((option) => option.getAttribute('data-site-tour-flow-option'))
      .filter((id) => id !== null),
  );
}

async function waitForPanel(page, name) {
  await page.waitForFunction(
    ({ surfaceSelector, expectedName }) => {
      const squash = (value) => (value ?? '').replace(/\s+/g, ' ').trim();
      return [...document.querySelectorAll(surfaceSelector)].some((surface) => {
        if (surface.hasAttribute('data-xploder-panel-exiting')) return false;
        const heading = surface.querySelector('h2');
        return heading !== null && squash(heading.textContent) === expectedName;
      });
    },
    { surfaceSelector: '[data-xploder-panel-surface]', expectedName: name },
    { timeout: WAIT_TIMEOUT_MS },
  );
}

async function waitForPanelGone(page, name) {
  await page.waitForFunction(
    ({ surfaceSelector, expectedName }) => {
      const squash = (value) => (value ?? '').replace(/\s+/g, ' ').trim();
      return ![...document.querySelectorAll(surfaceSelector)].some((surface) => {
        const heading = surface.querySelector('h2');
        return heading !== null && squash(heading.textContent) === expectedName;
      });
    },
    { surfaceSelector: '[data-xploder-panel-surface]', expectedName: name },
    { timeout: WAIT_TIMEOUT_MS },
  );
}

async function closeResidualPanel(page) {
  const close = page.locator('[data-xploder-panel-close]').first();
  if ((await close.count()) === 0) return;
  await close.click({ timeout: WAIT_TIMEOUT_MS });
  await page.locator('[data-xploder-panel-surface]').waitFor({
    state: 'detached',
    timeout: WAIT_TIMEOUT_MS,
  });
}

async function probePanels(page, components) {
  const panels = [];

  for (const component of components) {
    let pass = false;

    try {
      const proxy = page.locator(`[data-xploder-proxy="${component.id}"]`).first();
      if ((await proxy.count()) === 0) throw new Error('proxy missing');
      await proxy.click({ force: true, timeout: WAIT_TIMEOUT_MS });
      await waitForPanel(page, component.name);
      await page.locator('[data-xploder-panel-close]').first().click({
        timeout: WAIT_TIMEOUT_MS,
      });
      await waitForPanelGone(page, component.name);
      pass = true;
    } catch {
      await closeResidualPanel(page).catch(() => {});
    }

    panels.push({ id: component.id, name: component.name, pass });
    printCheck(`panel ${component.id}`, pass, `name=${JSON.stringify(component.name)}`);
  }

  return panels;
}

async function probeFlows(page, flows) {
  const results = [];
  await page.getByRole('tab', { name: 'Flows', exact: true }).click({
    timeout: WAIT_TIMEOUT_MS,
  });
  await page.locator(LIVE_FLOWS_PANEL_SELECTOR).waitFor({
    state: 'visible',
    timeout: WAIT_TIMEOUT_MS,
  });

  for (const flow of flows) {
    let steps = [];
    let pass = false;

    try {
      const option = page.locator(`[data-site-tour-flow-option="${flow.id}"]`);
      await option.click({ timeout: WAIT_TIMEOUT_MS });
      await page.waitForFunction(
        (flowId) =>
          [...document.querySelectorAll('[data-site-tour-flow-option]')].some(
            (candidate) =>
              candidate.getAttribute('data-site-tour-flow-option') === flowId &&
              candidate.getAttribute('aria-pressed') === 'true',
          ),
        flow.id,
        { timeout: WAIT_TIMEOUT_MS },
      );
      await page.waitForFunction(
        () => document.querySelector('[data-xploder-ready="true"]')?.getAttribute('data-xploder-tour') === 'idle',
        undefined,
        { timeout: WAIT_TIMEOUT_MS },
      );
      await page.evaluate(() => {
        window.__s18RouteProbeSteps = [];
      });

      const play = page.locator(
        '[data-site-tour-transport] button[aria-label="Start tour"]',
      );
      await play.click({ timeout: WAIT_TIMEOUT_MS });
      await page.waitForFunction(
        ({ lastStep }) => {
          const viewer = document.querySelector('[data-xploder-ready="true"]');
          const status = viewer?.getAttribute('data-xploder-tour') ?? null;
          const parsed = Number(viewer?.getAttribute('data-xploder-tour-step'));
          const seen = window.__s18RouteProbeSteps;
          if (
            seen !== undefined &&
            (status === 'playing' || status === 'ended') &&
            Number.isInteger(parsed) &&
            parsed >= 0 &&
            seen.at(-1) !== parsed
          ) {
            seen.push(parsed);
          }
          return status === 'ended' && parsed === lastStep;
        },
        { lastStep: flow.path.length - 1 },
        { timeout: TOUR_TIMEOUT_MS, polling: 50 },
      );
      steps = await page.evaluate(() => window.__s18RouteProbeSteps ?? []);
      pass = sameSequence(
        steps,
        flow.path.map((_, index) => index),
      );
    } catch {
      steps = await page.evaluate(() => window.__s18RouteProbeSteps ?? []).catch(() => []);
    }

    results.push({ id: flow.id, steps, pass });
    printCheck(`flow ${flow.id}`, pass, `steps=${JSON.stringify(steps)}`);
  }

  return results;
}

async function run() {
  const { routeUrl, outDir } = parseArgs(process.argv.slice(2));
  await mkdir(outDir, { recursive: true });

  const source = JSON.parse(await readFile(CONTENT_PATH, 'utf8'));
  const components = source.layers.flatMap((layer) => layer.components);
  const flows = source.flows;
  const expectedFlowIds = flows.map((flow) => flow.id);
  const panels = [];
  const flowResults = [];
  let counts = { layers: 0, components: 0, flows: 0 };
  let layersPass = false;
  let componentsPass = false;
  let flowCountPass = false;
  let flowIdsPass = false;
  let fatal = null;
  const browser = await chromium.launch();

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
      colorScheme: 'light',
    });
    const page = await context.newPage();
    const response = await page.goto(routeUrl.href, {
      waitUntil: 'load',
      timeout: WAIT_TIMEOUT_MS,
    });
    if (response === null || response.status() >= 400) {
      throw new Error(`route returned HTTP ${response?.status() ?? 'no response'}`);
    }

    await activateProjectViewer(page);
    const layerResult = await layerCounts(page);
    const optionIds = await flowOptionIds(page);
    counts = { ...layerResult, flows: optionIds.length };
    layersPass = counts.layers === EXPECTED_COUNTS.layers;
    componentsPass = counts.components === EXPECTED_COUNTS.components;
    flowCountPass = counts.flows === EXPECTED_COUNTS.flows;
    flowIdsPass = sameSet(optionIds, expectedFlowIds);

    printCheck('counts layers', layersPass, `expected=${EXPECTED_COUNTS.layers} actual=${counts.layers}`);
    printCheck(
      'counts components',
      componentsPass,
      `expected=${EXPECTED_COUNTS.components} actual=${counts.components}`,
    );
    printCheck('counts flows', flowCountPass, `expected=${EXPECTED_COUNTS.flows} actual=${counts.flows}`);
    printCheck(
      'flow option ids',
      flowIdsPass,
      `expected=${JSON.stringify(expectedFlowIds)} actual=${JSON.stringify(optionIds)}`,
    );

    panels.push(...(await probePanels(page, components)));
    flowResults.push(...(await probeFlows(page, flows)));
    await context.close();
  } catch (error) {
    fatal = error instanceof Error ? error.message : String(error);
  } finally {
    await browser.close();
  }

  const pass =
    fatal === null &&
    layersPass &&
    componentsPass &&
    flowCountPass &&
    flowIdsPass &&
    panels.length === EXPECTED_COUNTS.components &&
    panels.every((panel) => panel.pass) &&
    flowResults.length === EXPECTED_COUNTS.flows &&
    flowResults.every((flow) => flow.pass);

  await writeFile(
    join(outDir, 'T004-log-route-probe.json'),
    `${JSON.stringify({ counts, panels, flows: flowResults, pass }, null, 2)}\n`,
  );

  if (fatal !== null) printCheck('route probe', false, `error=${JSON.stringify(fatal)}`);
  else printCheck('route probe', pass);

  if (!pass) process.exitCode = 1;
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
