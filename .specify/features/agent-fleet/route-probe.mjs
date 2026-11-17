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
const KEYBOARD_VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900, isMobile: false, hasTouch: false },
  { name: 'mobile', width: 390, height: 844, isMobile: true, hasTouch: true },
];
const PALETTES = ['light', 'dark'];
const KEYBOARD_SCREENSHOT_TYPES = new Set([
  'nav-link',
  'theme-toggle',
  'project-back',
  'workbench-control',
  'workbench-fallback',
  'component-proxy',
  'panel-heading',
  'panel-close',
  'explore-tab',
  'flow-option',
  'tour-play',
  'tour-next',
  'other-focus',
]);
const LIVE_LAYERS_PANEL_SELECTOR =
  '[data-site-explore-live] > [data-site-explore] [data-site-layers-panel]';
const LIVE_LAYER_CHIP_SELECTOR =
  '[data-site-explore-live] > [data-site-explore] [data-site-layer-chip]';
const LIVE_LAYER_PARTS_SELECTOR =
  '[data-site-explore-live] > [data-site-explore] [data-site-layer-parts] li';
const LIVE_FLOWS_PANEL_SELECTOR =
  '[data-site-explore-live] > [data-site-explore] [data-site-explore-panel="flows"]';
const LIVE_EXPLORE_TAB_SELECTOR = '[data-site-explore-live] > [data-site-explore] [data-site-explore-tab]';
const LIVE_FLOWS_TAB_SELECTOR =
  '[data-site-explore-live] > [data-site-explore] [data-site-explore-tab="flows"]';
const LIVE_FLOW_OPTION_SELECTOR =
  '[data-site-explore-live] > [data-site-explore] [data-site-tour-flow-option]';
const LIVE_TOUR_PLAY_SELECTOR =
  '[data-site-explore-live] > [data-site-explore] [data-site-control="tour-play"]';
const LIVE_TOUR_NEXT_SELECTOR =
  '[data-site-explore-live] > [data-site-explore] [data-site-control="tour-next"]';

function usage() {
  console.error('usage: node route-probe.mjs <routeUrl> --out <evidenceDir> [--keyboard]');
  process.exit(2);
}

function parseArgs(argv) {
  let routeUrl;
  let outDir;
  let keyboard = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--out') {
      outDir = argv[index + 1];
      index += 1;
    } else if (argument === '--keyboard') {
      keyboard = true;
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

  return { routeUrl: parsed, outDir, keyboard };
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

function contextOptions(palette, viewport) {
  return {
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    isMobile: viewport.isMobile,
    hasTouch: viewport.hasTouch,
    colorScheme: palette,
  };
}

function evidenceText(value) {
  return String(value)
    .replaceAll(process.cwd(), '<worktree>')
    .replace(/(?:\/Users|\/home)\/[^/\s]+/g, '<home>')
    .replace(/\/tmp\//g, '<tmp>/');
}

function keyboardCellId(viewport, palette) {
  return `${viewport}-${palette}`;
}

async function waitForFrames(page, count = 2) {
  await page.evaluate(async (frameCount) => {
    for (let index = 0; index < frameCount; index += 1) {
      await new Promise((resolveFrame) => requestAnimationFrame(() => resolveFrame()));
    }
  }, count);
}

async function waitForKeyboardWorkbench(page) {
  await waitForViewerReady(page);
  await page.waitForFunction(
    (expectedComponents) => {
      const live = document.querySelector('[data-site-live]');
      return (
        live?.getAttribute('data-site-live-state') === 'revealed' &&
        document.querySelectorAll('[data-xploder-navigator] [data-xploder-proxy]').length ===
          expectedComponents
      );
    },
    EXPECTED_COUNTS.components,
    { timeout: WAIT_TIMEOUT_MS },
  );
}

async function activeFocus(page) {
  return await page.evaluate(() => {
    const squash = (value) => (value ?? '').replace(/\s+/g, ' ').trim();
    const active = document.activeElement;

    if (!(active instanceof HTMLElement)) {
      return {
        tag: 'none',
        role: 'none',
        name: '',
        text: '',
        data: {},
        key: 'none',
        matches: {},
        outlineStyle: 'none',
        outlineWidth: 0,
        outlineColor: '',
        boxShadow: 'none',
        ringVisible: false,
        focusVisible: false,
      };
    }

    const data = {};
    for (const attribute of active.attributes) {
      if (attribute.name.startsWith('data-')) data[attribute.name] = attribute.value;
    }

    const text = squash(active.innerText ?? active.textContent);
    const labelledBy = active.getAttribute('aria-labelledby');
    const labelledText =
      labelledBy === null
        ? ''
        : labelledBy
            .split(/\s+/)
            .map((id) => squash(document.getElementById(id)?.textContent))
            .filter((value) => value !== '')
            .join(' ');
    const name = squash(
      active.getAttribute('aria-label') ??
        (labelledText === '' ? undefined : labelledText) ??
        (text === '' ? undefined : text) ??
        active.getAttribute('title') ??
        active.getAttribute('alt') ??
        '',
    );
    const tag = active.tagName.toLowerCase();
    const implicitRole =
      tag === 'a'
        ? 'link'
        : tag === 'button'
          ? 'button'
          : tag === 'summary'
            ? 'button'
            : tag === 'input'
              ? 'textbox'
              : tag === 'select'
                ? 'combobox'
                : undefined;
    const role = active.getAttribute('role') ?? implicitRole ?? '';
    const style = getComputedStyle(active);
    const ring = document.querySelector(
      '[data-xploder-navigator] [data-xploder-focus-ring]',
    );
    const ringStyle = ring instanceof SVGElement ? getComputedStyle(ring) : null;
    const ringRect = ring instanceof SVGElement ? ring.getBoundingClientRect() : null;
    const polygon = ring instanceof SVGElement ? ring.querySelector('polygon') : null;
    const ringVisible =
      ring instanceof SVGElement &&
      ringStyle !== null &&
      ringStyle.display !== 'none' &&
      ringStyle.visibility !== 'hidden' &&
      ringStyle.visibility !== 'collapse' &&
      Number(ringStyle.opacity) !== 0 &&
      ringRect !== null &&
      ringRect.width > 0 &&
      ringRect.height > 0 &&
      (polygon?.getAttribute('points') ?? '') !== '';
    const matches = {
      navLink: active.matches('a[href]'),
      themeToggle: active.matches('button[aria-label^="Switch to "]'),
      projectBack:
        active.matches('a[href="/projects"]') || text.includes('All projects'),
      workbench:
        active.matches('[data-xploder-ready="true"]') ||
        active.matches('[data-site-control="explore-3d"]') ||
        active.closest('[data-site-workbench]') !== null ||
        active.closest('[data-site-dock-controls]') !== null,
      workbenchFallback: active.matches('[data-site-outline]'),
      proxy: active.matches('[data-xploder-proxy]'),
      panelHeading: active.matches('[data-xploder-panel-surface] h2'),
      panelClose: active.matches('[data-xploder-panel-close]'),
      exploreTab: active.matches('[data-site-explore-tab]'),
      flowOption: active.matches('[data-site-tour-flow-option]'),
      tourPlay: active.matches('[data-site-control="tour-play"]'),
      tourNext: active.matches('[data-site-control="tour-next"]'),
    };
    const dataKey = Object.entries(data)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => `${key}=${value}`)
      .join('|');
    const outlineWidth = Number.parseFloat(style.outlineWidth) || 0;
    const focusVisible =
      (style.outlineStyle !== 'none' && outlineWidth >= 2) ||
      (style.boxShadow !== 'none' && style.boxShadow !== '') ||
      (matches.proxy && ringVisible);

    return {
      tag,
      role,
      name,
      text: text.slice(0, 160),
      data,
      key: `${tag}|${dataKey}|${name}`,
      matches,
      outlineStyle: style.outlineStyle,
      outlineWidth,
      outlineColor: style.outlineColor,
      boxShadow: style.boxShadow,
      ringVisible,
      focusVisible,
    };
  });
}

function classifyFocus(info) {
  const matches = info.matches ?? {};

  if (matches.proxy) return 'component-proxy';
  if (matches.panelHeading) return 'panel-heading';
  if (matches.panelClose) return 'panel-close';
  if (matches.exploreTab) return 'explore-tab';
  if (matches.flowOption) return 'flow-option';
  if (matches.tourPlay) return 'tour-play';
  if (matches.tourNext) return 'tour-next';
  if (matches.themeToggle) return 'theme-toggle';
  if (matches.projectBack) return 'project-back';
  if (matches.navLink) return 'nav-link';
  if (matches.workbenchFallback) return 'workbench-fallback';
  if (matches.workbench) return 'workbench-control';
  return 'other-focus';
}

async function captureFocusStop(page, cell, stage, typeOverride) {
  await waitForFrames(page, 2);
  const info = await activeFocus(page);
  const type = typeOverride ?? classifyFocus(info);
  const stop = { stage, type, ...info };

  cell.focusStops.push(stop);
  if (!info.focusVisible) cell.focusFailures.push(stop);

  if (
    cell.captureScreenshots &&
    KEYBOARD_SCREENSHOT_TYPES.has(type) &&
    !cell.capturedScreenshotTypes.has(type)
  ) {
    const filename = `T006-screenshot-focus-${type}-${cell.viewport}-${cell.palette}.png`;
    await page.screenshot({ path: join(cell.outDir, filename) });
    cell.capturedScreenshotTypes.add(type);
    cell.screenshots.push(filename);
  }

  return stop;
}

async function pressTabAndCapture(page, cell, stage, options = {}) {
  await page.keyboard.press(options.shift === true ? 'Shift+Tab' : 'Tab');
  return await captureFocusStop(page, cell, stage, options.type);
}

async function waitForActive(page, predicate, argument, description) {
  await page.waitForFunction(predicate, argument, { timeout: WAIT_TIMEOUT_MS });
  return description;
}

async function focusPathUntilProxy(page, cell) {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  const first = await pressTabAndCapture(page, cell, 'focus-order');
  const firstPass = first.tag === 'a' && first.name === 'Skip to content';

  await waitForKeyboardWorkbench(page);

  let pass = firstPass;
  let workbenchControlPass = false;
  let proxyPass = first.matches?.proxy === true;

  for (let index = 0; index < 32 && !proxyPass; index += 1) {
    const stop = await pressTabAndCapture(page, cell, 'focus-order');
    if (stop.type === 'workbench-control') workbenchControlPass = true;
    proxyPass = stop.matches?.proxy === true;
  }

  pass = pass && workbenchControlPass && proxyPass;
  cell.focusOrderPass = pass;
  cell.focusOrderDetail = {
    first: first.name,
    stops: cell.focusStops.filter((stop) => stop.stage === 'focus-order').length,
    workbenchControl: workbenchControlPass,
    navigatorProxy: proxyPass,
  };
  return pass;
}

async function waitForActivePanelHeading(page, name) {
  await waitForActive(
    page,
    ({ expectedName }) => {
      const squash = (value) => (value ?? '').replace(/\s+/g, ' ').trim();
      const active = document.activeElement;
      if (!(active instanceof HTMLElement)) return false;
      const surface = active.closest('[data-xploder-panel-surface]');
      return (
        active.matches('h2') &&
        surface !== null &&
        squash(active.textContent) === expectedName &&
        surface.querySelector('h2') === active
      );
    },
    { expectedName: name },
    'panel heading',
  );
}

async function waitForActiveClose(page) {
  await waitForActive(
    page,
    () => {
      const active = document.activeElement;
      return (
        active instanceof HTMLElement &&
        active.matches('[data-xploder-panel-close]') &&
        active.closest('[data-xploder-panel-surface]') !== null
      );
    },
    undefined,
    'panel close',
  );
}

async function waitForFocusReturn(page, componentId) {
  await waitForActive(
    page,
    ({ expectedId }) => {
      const active = document.activeElement;
      return (
        active instanceof HTMLElement &&
        active.matches('[data-xploder-proxy]') &&
        active.getAttribute('data-xploder-proxy') === expectedId
      );
    },
    { expectedId: componentId },
    'proxy focus return',
  );
}

async function moveToProxy(page, index) {
  if (index === 0) {
    await page.keyboard.press('Home');
  } else {
    await page.keyboard.press('ArrowDown');
  }
  await waitForFrames(page, 1);
}

async function probeKeyboardPanels(page, cell, components) {
  const results = [];

  for (let index = 0; index < components.length; index += 1) {
    const component = components[index];
    let pass = false;
    let detail = '';

    try {
      await moveToProxy(page, index);
      await waitForActive(
        page,
        ({ expectedId }) =>
          document.activeElement instanceof HTMLElement &&
          document.activeElement.getAttribute('data-xploder-proxy') === expectedId,
        { expectedId: component.id },
        'proxy',
      );
      await captureFocusStop(page, cell, 'panel-open', 'component-proxy');
      await page.keyboard.press('Enter');
      await waitForPanel(page, component.name);
      await waitForActivePanelHeading(page, component.name);
      await captureFocusStop(page, cell, 'panel-open', 'panel-heading');

      if (cell.viewport === 'mobile' && cell.palette === 'light' && index === 0) {
        await captureTapTargets(page, cell, 'panel-open');
      }

      await page.keyboard.press('Tab');
      await waitForActiveClose(page);
      await captureFocusStop(page, cell, 'panel-open', 'panel-close');
      await page.keyboard.press('Escape');
      await waitForPanelGone(page, component.name);
      await waitForFocusReturn(page, component.id);
      await captureFocusStop(page, cell, 'panel-close', 'component-proxy');
      pass = true;
    } catch (error) {
      detail = evidenceText(error instanceof Error ? error.message : String(error));
      await page.keyboard.press('Escape').catch(() => {});
      await page
        .locator(`[data-xploder-proxy="${component.id}"]`)
        .focus({ timeout: WAIT_TIMEOUT_MS })
        .catch(() => {});
    }

    results.push({ id: component.id, name: component.name, pass, detail });
  }

  cell.panels = results;
  cell.panelsPass = results.length === components.length && results.every((result) => result.pass);
  return cell.panelsPass;
}

async function pressTabUntil(page, cell, stage, selector, options = {}) {
  const maximum = options.maximum ?? 24;

  for (let index = 0; index < maximum; index += 1) {
    const matched = await page.evaluate(
      (targetSelector) =>
        document.activeElement instanceof HTMLElement &&
        document.activeElement.matches(targetSelector),
      selector,
    );
    if (matched) return true;
    await pressTabAndCapture(page, cell, stage, { shift: options.shift === true });
  }

  return false;
}

async function focusFlowOption(page, cell, targetIndex) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const current = await page.evaluate((optionSelector) => {
      const options = [...document.querySelectorAll(optionSelector)];
      const active = document.activeElement;
      return {
        activeIndex:
          active instanceof HTMLElement &&
          active.matches('[data-site-tour-flow-option]')
            ? options.indexOf(active)
            : -1,
        optionCount: options.length,
      };
    }, LIVE_FLOW_OPTION_SELECTOR);

    if (current.activeIndex === targetIndex) return true;

    const shift =
      current.activeIndex >= 0 ? current.activeIndex > targetIndex : targetIndex !== 0;
    await pressTabAndCapture(page, cell, 'flows', { shift });
  }

  return false;
}

async function waitForTourStatus(page, status, minimumStep) {
  await page.waitForFunction(
    ({ expectedStatus, expectedMinimumStep }) => {
      const viewer = document.querySelector('[data-xploder-ready="true"]');
      const step = Number(viewer?.getAttribute('data-xploder-tour-step'));
      return (
        viewer?.getAttribute('data-xploder-tour') === expectedStatus &&
        Number.isInteger(step) &&
        (expectedMinimumStep === null || step >= expectedMinimumStep)
      );
    },
    { expectedStatus: status, expectedMinimumStep: minimumStep ?? null },
    { timeout: TOUR_TIMEOUT_MS, polling: 50 },
  );
}

async function probeKeyboardFlows(page, cell, flows) {
  const results = [];
  const tabReached = await pressTabUntil(page, cell, 'flows', LIVE_EXPLORE_TAB_SELECTOR);

  if (!tabReached) {
    cell.flowsPass = false;
    cell.flows = flows.map((flow) => ({ id: flow.id, pass: false, detail: 'tablist unreachable' }));
    return false;
  }

  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(
    (tabSelector) => {
      const tab = document.querySelector(tabSelector);
      return (
        tab?.getAttribute('aria-selected') === 'true' &&
        document.activeElement === tab &&
        document
          .querySelector('[data-site-explore-live] > [data-site-explore] [data-site-explore-panel="flows"]')
          ?.hasAttribute('hidden') === false
      );
    },
    LIVE_FLOWS_TAB_SELECTOR,
    { timeout: WAIT_TIMEOUT_MS },
  );
  await captureFocusStop(page, cell, 'flows', 'explore-tab');

  if (cell.viewport === 'mobile' && cell.palette === 'light') {
    await captureTapTargets(page, cell, 'flows');
  }

  for (let index = 0; index < flows.length; index += 1) {
    const flow = flows[index];
    let pass = false;
    let detail = '';
    let initialStep = null;
    let playingStep = null;
    let pausedStep = null;
    let nextStep = null;

    try {
      if (!(await focusFlowOption(page, cell, index))) throw new Error('flow option unreachable');
      await captureFocusStop(page, cell, 'flows', 'flow-option');
      await page.keyboard.press('Enter');
      await page.waitForFunction(
        ({ flowId, optionSelector }) =>
          [...document.querySelectorAll(optionSelector)].some(
            (option) =>
              option.getAttribute('data-site-tour-flow-option') === flowId &&
              option.getAttribute('aria-pressed') === 'true',
          ),
        { flowId: flow.id, optionSelector: LIVE_FLOW_OPTION_SELECTOR },
        { timeout: WAIT_TIMEOUT_MS },
      );
      await waitForTourStatus(page, 'idle', null);
      initialStep = await page.evaluate(() =>
        Number(document.querySelector('[data-xploder-ready="true"]')?.getAttribute('data-xploder-tour-step')),
      );

      if (!(await pressTabUntil(page, cell, 'flows', LIVE_TOUR_PLAY_SELECTOR))) {
        throw new Error('play control unreachable');
      }
      await captureFocusStop(page, cell, 'flows', 'tour-play');
      await page.keyboard.press('Enter');
      await waitForTourStatus(page, 'playing', initialStep + 1);
      playingStep = await page.evaluate(() =>
        Number(document.querySelector('[data-xploder-ready="true"]')?.getAttribute('data-xploder-tour-step')),
      );

      const stillOnPlay = await page.evaluate(
        (playSelector) =>
          document.activeElement instanceof HTMLElement &&
          document.activeElement.matches(playSelector),
        LIVE_TOUR_PLAY_SELECTOR,
      );
      if (!stillOnPlay) throw new Error('play control lost focus');
      await page.keyboard.press('Enter');
      await waitForTourStatus(page, 'paused', null);
      pausedStep = await page.evaluate(() =>
        Number(document.querySelector('[data-xploder-ready="true"]')?.getAttribute('data-xploder-tour-step')),
      );

      if (!(await pressTabUntil(page, cell, 'flows', LIVE_TOUR_NEXT_SELECTOR))) {
        throw new Error('next control unreachable');
      }
      await captureFocusStop(page, cell, 'flows', 'tour-next');
      await page.keyboard.press('Enter');
      await waitForTourStatus(page, 'paused', pausedStep + 1);
      nextStep = await page.evaluate(() =>
        Number(document.querySelector('[data-xploder-ready="true"]')?.getAttribute('data-xploder-tour-step')),
      );
      pass = nextStep === pausedStep + 1 && playingStep >= initialStep + 1;
    } catch (error) {
      detail = evidenceText(error instanceof Error ? error.message : String(error));
    }

    results.push({
      id: flow.id,
      initialStep,
      playingStep,
      pausedStep,
      nextStep,
      pass,
      detail,
    });
  }

  cell.flows = results;
  cell.flowsPass = results.length === flows.length && results.every((result) => result.pass);
  return cell.flowsPass;
}

async function captureTapTargets(page, cell, state) {
  const elements = await page.evaluate(() => {
    const squash = (value) => (value ?? '').replace(/\s+/g, ' ').trim();
    const sanitizeEmail = (value) =>
      value.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '<email>');
    const selector =
      'a[href], button, [role="tab"], input, select, summary, [tabindex]:not([tabindex="-1"])';
    const candidates = [...document.querySelectorAll(selector)];
    const visible = [];

    for (const element of candidates) {
      if (!(element instanceof HTMLElement)) continue;
      if (element.matches('[data-xploder-proxy]') || element.closest('[data-xploder-navigator]')) {
        continue;
      }

      let hidden = false;
      let current = element;
      while (current !== null) {
        const style = getComputedStyle(current);
        if (
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          style.visibility === 'collapse' ||
          Number(style.opacity) === 0
        ) {
          hidden = true;
          break;
        }
        current = current.parentElement;
      }
      if (hidden) continue;

      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const clipped =
        (style.clip !== 'auto' && style.clip !== '') ||
        style.clipPath === 'inset(50%)' ||
        (rect.width <= 1 && rect.height <= 1);
      if (clipped || rect.width <= 0 || rect.height <= 0) continue;

      const data = {};
      for (const attribute of element.attributes) {
        if (attribute.name.startsWith('data-')) data[attribute.name] = attribute.value;
      }
      const text = sanitizeEmail(squash(element.innerText ?? element.textContent).slice(0, 120));
      const name = sanitizeEmail(squash(element.getAttribute('aria-label') ?? text));
      const tag = element.tagName.toLowerCase();
      const role =
        element.getAttribute('role') ??
        (tag === 'a' ? 'link' : tag === 'button' ? 'button' : tag === 'summary' ? 'button' : '');
      const dataKey = Object.entries(data)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, value]) => `${key}=${value}`)
        .join('|');

      visible.push({
        key: `${tag}|${dataKey}|${name}|${text}`,
        tag,
        role,
        name,
        text,
        data,
        width: Math.round(rect.width * 100) / 100,
        height: Math.round(rect.height * 100) / 100,
        pass: rect.width >= 44 && rect.height >= 44,
      });
    }

    return visible;
  });

  cell.tapTargetSnapshots.push({ state, elements });
}

function mergeTapTargets(cells) {
  const merged = new Map();
  const states = [];

  for (const cell of cells) {
    if (cell.viewport !== 'mobile' || cell.palette !== 'light') continue;
    for (const snapshot of cell.tapTargetSnapshots) {
      states.push(snapshot.state);
      for (const element of snapshot.elements) {
        const current = merged.get(element.key);
        if (current === undefined) {
          merged.set(element.key, { ...element, states: [snapshot.state] });
        } else if (!current.states.includes(snapshot.state)) {
          current.states.push(snapshot.state);
        }
      }
    }
  }

  const elements = [...merged.values()];
  const failures = elements.filter((element) => !element.pass);
  return { pass: elements.length > 0 && failures.length === 0, states, elements, failures };
}

async function runKeyboardCell(browser, routeUrl, outDir, viewport, palette, components, flows) {
  const context = await browser.newContext(contextOptions(palette, viewport));
  const page = await context.newPage();
  const cell = {
    id: keyboardCellId(viewport.name, palette),
    viewport: viewport.name,
    palette,
    outDir,
    captureScreenshots: viewport.name === 'desktop' || palette === 'light',
    capturedScreenshotTypes: new Set(),
    screenshots: [],
    focusStops: [],
    focusFailures: [],
    focusOrderPass: false,
    focusOrderDetail: null,
    panels: [],
    panelsPass: false,
    flows: [],
    flowsPass: false,
    tapTargetSnapshots: [],
    themePass: false,
    fatal: null,
  };

  try {
    const response = await page.goto(routeUrl.href, {
      waitUntil: 'load',
      timeout: WAIT_TIMEOUT_MS,
    });
    if (response === null || response.status() >= 400) {
      throw new Error(`route returned HTTP ${response?.status() ?? 'no response'}`);
    }

    await waitForHydration(page);
    await page.waitForFunction(
      (expected) =>
        document.documentElement.classList.contains(expected) &&
        getComputedStyle(document.documentElement).colorScheme === expected,
      palette,
      { timeout: WAIT_TIMEOUT_MS },
    );
    cell.themePass = true;

    const focusOrderPass = await focusPathUntilProxy(page, cell);
    if (!focusOrderPass) throw new Error('keyboard focus order did not reach the navigator');
    await captureTapTargets(page, cell, 'default');

    await probeKeyboardPanels(page, cell, components);
    await probeKeyboardFlows(page, cell, flows);
  } catch (error) {
    cell.fatal = evidenceText(error instanceof Error ? error.message : String(error));
  } finally {
    await context.close();
  }

  cell.focusVisiblePass =
    cell.focusStops.length > 0 && cell.focusFailures.length === 0 && cell.fatal === null;
  cell.pass =
    cell.fatal === null &&
    cell.themePass &&
    cell.focusOrderPass &&
    cell.focusVisiblePass &&
    cell.panelsPass &&
    cell.flowsPass;
  delete cell.outDir;
  delete cell.capturedScreenshotTypes;
  return cell;
}

async function runKeyboard({ routeUrl, outDir }, source) {
  const components = source.layers.flatMap((layer) => layer.components);
  const flows = source.flows;
  const browser = await chromium.launch();
  const cells = [];

  try {
    for (const viewport of KEYBOARD_VIEWPORTS) {
      for (const palette of PALETTES) {
        cells.push(
          await runKeyboardCell(
            browser,
            routeUrl,
            outDir,
            viewport,
            palette,
            components,
            flows,
          ),
        );
      }
    }
  } finally {
    await browser.close();
  }

  const tapTargets = mergeTapTargets(cells);
  const mobileLight = cells.find((cell) => cell.viewport === 'mobile' && cell.palette === 'light');
  if (mobileLight !== undefined) {
    mobileLight.tapTargetsPass = tapTargets.pass;
    mobileLight.pass = mobileLight.pass && tapTargets.pass;
  }

  const pass = cells.length === KEYBOARD_VIEWPORTS.length * PALETTES.length && cells.every((cell) => cell.pass) && tapTargets.pass;

  await writeFile(
    join(outDir, 'T006-log-keyboard.json'),
    `${JSON.stringify(
      {
        kind: 'keyboard-probe',
        version: 1,
        route: routeUrl.pathname,
        expected: { panels: EXPECTED_COUNTS.components, flows: EXPECTED_COUNTS.flows },
        cells: cells.map(({ tapTargetSnapshots: _tapTargetSnapshots, ...cell }) => cell),
        tapTargets: {
          pass: tapTargets.pass,
          states: [...new Set(tapTargets.states)],
          failures: tapTargets.failures.length,
        },
        pass,
      },
      null,
      2,
    )}\n`,
  );
  await writeFile(
    join(outDir, 'T006-log-tap-targets.json'),
    `${JSON.stringify(
      {
        kind: 'tap-target-probe',
        version: 1,
        viewport: 'mobile',
        width: 390,
        height: 844,
        palette: 'light',
        minimum: 44,
        states: [...new Set(tapTargets.states)],
        elements: tapTargets.elements,
        failures: tapTargets.failures,
        pass: tapTargets.pass,
      },
      null,
      2,
    )}\n`,
  );

  for (const cell of cells) {
    printCheck(
      `keyboard focus-order ${cell.id}`,
      cell.focusOrderPass && cell.themePass,
      `stops=${cell.focusOrderDetail?.stops ?? 0}`,
    );
    printCheck(
      `keyboard panels ${cell.id}`,
      cell.panelsPass,
      `${cell.panels.filter((panel) => panel.pass).length}/${EXPECTED_COUNTS.components}`,
    );
    printCheck(
      `keyboard flows ${cell.id}`,
      cell.flowsPass,
      `${cell.flows.filter((flow) => flow.pass).length}/${EXPECTED_COUNTS.flows}`,
    );
    printCheck(
      `keyboard focus-visible ${cell.id}`,
      cell.focusVisiblePass,
      `stops=${cell.focusStops.length} failed=${cell.focusFailures.length}`,
    );
    if (cell.fatal !== null) printCheck(`keyboard ${cell.id}`, false, `error=${JSON.stringify(cell.fatal)}`);
  }
  printCheck(
    'keyboard tap-targets mobile-light',
    tapTargets.pass,
    `elements=${tapTargets.elements.length} failures=${tapTargets.failures.length}`,
  );
  printCheck('keyboard', pass);

  if (!pass) process.exitCode = 1;
}

async function run() {
  const { routeUrl, outDir, keyboard } = parseArgs(process.argv.slice(2));
  await mkdir(outDir, { recursive: true });

  const source = JSON.parse(await readFile(CONTENT_PATH, 'utf8'));
  if (keyboard) {
    await runKeyboard({ routeUrl, outDir }, source);
    return;
  }

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
