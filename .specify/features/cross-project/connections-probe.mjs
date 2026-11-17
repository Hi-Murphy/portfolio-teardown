#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { quadsIntersect } from '../label-system/label-sweep.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../../..');
const SLUGS = ['jev-toolkit', 'websocket-inspector'];
const SLUG_SHORT = new Map([
  ['jev-toolkit', 'jev'],
  ['websocket-inspector', 'wsi'],
]);
const VIEWPORTS = [
  { name: '390', width: 390, height: 844, mobile: true },
  { name: '1440', width: 1440, height: 900, mobile: false },
];
const SCHEMES = ['light', 'dark'];
const CHECKS = [
  ['order', 'ORDER'],
  ['roles', 'ROLES'],
  ['linkText', 'LINK-TEXT'],
  ['tabOrder', 'TAB-ORDER'],
  ['focusRing', 'FOCUS-RING'],
  ['tapTarget', 'TAP-TARGET'],
  ['horizontalScroll', 'NO-HSCROLL'],
  ['overlap', 'NO-OVERLAP'],
];
function usage() {
  console.error('usage: node connections-probe.mjs <baseUrl> --out <dir>');
  process.exit(2);
}

function parseArgs(argv) {
  const positional = [];
  let out;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--out') {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith('--')) usage();
      out = value;
      index += 1;
    } else if (argument.startsWith('--')) {
      usage();
    } else {
      positional.push(argument);
    }
  }

  if (positional.length !== 1 || out === undefined) usage();
  const baseUrl = positional[0].replace(/\/$/, '');
  if (!/^https?:\/\//.test(baseUrl)) usage();
  return { baseUrl, out: resolve(out) };
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function loadExpected() {
  return new Map(
    SLUGS.map((slug) => {
      const project = readJson(resolve(REPO, '.specify/content', `${slug}.json`));
      const source = readJson(resolve(REPO, '.specify/content/relationships', `${slug}.json`));
      if (typeof project.meta?.name !== 'string' || !Array.isArray(source.relationships)) {
        throw new Error(`invalid canonical content for ${slug}`);
      }

      const relationships = source.relationships.map((relationship) => {
        if (
          typeof relationship.to !== 'string' ||
          typeof relationship.note !== 'string' ||
          typeof relationship.kind !== 'string'
        ) {
          throw new Error(`invalid relationship in ${slug}.json`);
        }
        const target = readJson(resolve(REPO, '.specify/content', `${relationship.to}.json`));
        if (typeof target.meta?.name !== 'string') {
          throw new Error(`invalid target content for ${relationship.to}`);
        }
        return {
          ...relationship,
          name: target.meta.name,
          href: `/projects/${relationship.to}`,
        };
      });

      return [slug, { name: project.meta.name, relationships }];
    }),
  );
}

function addCheck(cell, id, label, pass, expected, actual) {
  cell.checks.push({ id, label, pass, expected, actual });
}

function checkPass(cell, id) {
  return cell.checks.find((check) => check.id === id)?.pass === true;
}

function pageGeometry() {
  const focusableSelector = 'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])';
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  const shift = (quad) => quad.map(([x, y]) => [x + scrollX, y + scrollY]);
  const rect = (element) => {
    const box = element.getBoundingClientRect();
    return {
      x: box.left + scrollX,
      y: box.top + scrollY,
      width: box.width,
      height: box.height,
    };
  };
  const quadFromRect = (box) => [
    [box.x, box.y],
    [box.x + box.width, box.y],
    [box.x + box.width, box.y + box.height],
    [box.x, box.y + box.height],
  ];
  const descriptor = (element) => ({
    tag: element.tagName.toLowerCase(),
    text: (element.textContent ?? '').replace(/\s+/g, ' ').trim(),
    ariaLabel: element.getAttribute('aria-label'),
    dataControl: element.getAttribute('data-site-control'),
    href: element.getAttribute('href'),
  });
  const visible = (element) => {
    if (element.getClientRects().length === 0) return false;
    if (element.closest('[inert]') !== null) return false;
    let opacity = 1;
    for (let current = element; current !== null; current = current.parentElement) {
      const style = getComputedStyle(current);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      opacity *= Number(style.opacity === '' ? 1 : style.opacity);
    }
    return opacity > 0;
  };
  const focusable = (root) =>
    [...root.querySelectorAll(focusableSelector)].filter((element) => visible(element));

  const effectiveOpacity = (element) => {
    let opacity = 1;
    for (let current = element; current !== null; current = current.parentElement) {
      const style = getComputedStyle(current);
      if (style.visibility === 'hidden' || style.display === 'none') return 0;
      opacity *= Number(style.opacity === '' ? 1 : style.opacity);
    }
    return opacity;
  };
  const painted = (element) =>
    effectiveOpacity(element) > 0 && element.getClientRects().length > 0;
  const transformedBox = (element) => {
    const box = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    if (style.transform === 'none') {
      return shift([
        [box.left, box.top],
        [box.right, box.top],
        [box.right, box.bottom],
        [box.left, box.bottom],
      ]);
    }
    const matrix = new DOMMatrix(style.transform);
    const width = element.offsetWidth;
    const height = element.offsetHeight;
    const parent = element.offsetParent?.getBoundingClientRect() ?? { left: 0, top: 0 };
    const originX = parent.left + element.offsetLeft;
    const originY = parent.top + element.offsetTop;
    return shift(
      [
        [0, 0],
        [width, 0],
        [width, height],
        [0, height],
      ].map(([x, y]) => {
        const point = matrix.transformPoint(new DOMPoint(x, y));
        return [originX + point.x, originY + point.y];
      }),
    );
  };
  const rowQuad = (element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const rects = [...range.getClientRects()].filter((item) => item.width > 0 && item.height > 0);
    if (rects.length === 0) return transformedBox(element);
    const left = Math.min(...rects.map((item) => item.left));
    const top = Math.min(...rects.map((item) => item.top));
    const right = Math.max(...rects.map((item) => item.right));
    const bottom = Math.max(...rects.map((item) => item.bottom));
    return shift([
      [left, top],
      [right, top],
      [right, bottom],
      [left, bottom],
    ]);
  };

  const workbench = document.querySelector('[data-site-workbench]');
  const strip = document.querySelector('[data-site-connections]');
  const main = document.querySelector('main#main');
  const footer = document.querySelector('footer');
  const order = {
    found: workbench !== null && strip !== null && footer !== null && main !== null,
    workbenchBeforeStrip:
      workbench !== null &&
      strip !== null &&
      (workbench.compareDocumentPosition(strip) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
    stripBeforeFooter:
      strip !== null &&
      footer !== null &&
      (strip.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
    stripInMain:
      strip !== null && main !== null && strip.closest('main') === main && main.id === 'main',
  };

  if (workbench === null || strip === null || footer === null || main === null) {
    return { order };
  }

  const stripBox = rect(strip);
  const labels = [];
  const add = (element, marker, key, kind, quad) => {
    labels.push({ marker, key, kind, quad, painted: painted(element) });
  };
  const wrapper = document.querySelector('[data-xploder-lettering-on]');
  if (wrapper !== null) {
    for (const element of wrapper.querySelectorAll('[data-xploder-label]')) {
      const key = element.getAttribute('data-xploder-label');
      add(element, 'data-xploder-label', key, key?.split(':')[0] ?? null, transformedBox(element));
    }
    for (const element of wrapper.querySelectorAll('[data-xploder-titleblock-box]')) {
      add(
        element,
        'data-xploder-titleblock-box',
        element.getAttribute('data-xploder-titleblock-box'),
        'titleblock',
        transformedBox(element),
      );
    }
    for (const element of wrapper.querySelectorAll('[data-xploder-lettering]')) {
      add(
        element,
        'data-xploder-lettering',
        element.getAttribute('data-xploder-lettering'),
        element.getAttribute('data-xploder-lettering-kind'),
        transformedBox(element),
      );
    }
    for (const element of wrapper.querySelectorAll(
      '[data-xploder-lettering-layer-label]',
    )) {
      add(
        element,
        'data-xploder-lettering-layer-label',
        element.getAttribute('data-xploder-lettering-layer-label'),
        element.getAttribute('data-xploder-lettering-layer-kind'),
        transformedBox(element),
      );
    }
    for (const element of wrapper.querySelectorAll('[data-xploder-column-row]')) {
      add(
        element,
        'data-xploder-column-row',
        element.getAttribute('data-xploder-column-row'),
        'column',
        rowQuad(element),
      );
    }
  }

  const workbenchFocusables = focusable(workbench).map((element) => ({
    ...descriptor(element),
    rect: rect(element),
  }));
  const footerFocusables = focusable(footer).map((element) => ({
    ...descriptor(element),
    rect: rect(element),
  }));
  const links = [...strip.querySelectorAll('li a')].map((element) => ({
    ...descriptor(element),
    rect: rect(element),
  }));
  return {
    order,
    stripRect: stripBox,
    stripQuad: quadFromRect(stripBox),
    labels,
    viewerFound: wrapper !== null,
    workbenchFocusables,
    footerFocusables,
    links,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  };
}

async function activateViewer(page) {
  const control = page.locator('[data-site-control="explore-3d"]').first();
  if ((await control.count()) > 0) {
    await control.waitFor({ state: 'visible', timeout: 60_000 });
    await control.click();
  }
  await page.locator('[data-xploder-lettering-on]').first().waitFor({
    state: 'visible',
    timeout: 60_000,
  });
  await page.locator('[data-xploder-ready="true"]').first().waitFor({
    state: 'attached',
    timeout: 60_000,
  });
  await page.waitForFunction(() => (window.__xploderSettleCount ?? 0) > 0, undefined, {
    timeout: 60_000,
  });
  await page.waitForTimeout(500);
}

async function activeDescriptor(page) {
  return await page.evaluate(() => {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement)) return null;
    return {
      tag: active.tagName.toLowerCase(),
      text: (active.textContent ?? '').replace(/\s+/g, ' ').trim(),
      ariaLabel: active.getAttribute('aria-label'),
      dataControl: active.getAttribute('data-site-control'),
      href: active.getAttribute('href'),
    };
  });
}

async function runCell(browser, baseUrl, slug, expected, viewport, scheme, out) {
  const cell = {
    cellId: `${slug}-${viewport.name}-${scheme}`,
    slug,
    viewport: `${viewport.width}x${viewport.height}`,
    colorScheme: scheme,
    checks: [],
    rectangles: {},
    screenshots: {},
  };
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: viewport.mobile,
    hasTouch: viewport.mobile,
    deviceScaleFactor: 1,
    colorScheme: scheme,
    reducedMotion: 'no-preference',
  });
  await context.addInitScript(() => {
    window.__xploderSettleCount = 0;
    document.addEventListener(
      'xploder:settled',
      () => {
        window.__xploderSettleCount += 1;
      },
      true,
    );
  });
  const page = await context.newPage();

  try {
    await page.goto(`${baseUrl}/projects/${slug}`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts?.ready);
    await page.locator('[data-site-connections]').first().waitFor({
      state: 'attached',
      timeout: 60_000,
    });
    await activateViewer(page);

    const region = page.getByRole('region', { name: 'Connections', exact: true });
    const list = page.getByRole('list', { name: 'Connections', exact: true });
    const regionCount = await region.count();
    const listCount = await list.count();
    const itemCount = await region.locator('li').count();
    const linkCount = await region.locator('li a').count();
    addCheck(
      cell,
      'roles',
      'ROLES',
      regionCount === 1 &&
        listCount === 1 &&
        itemCount === expected.relationships.length &&
        linkCount === expected.relationships.length,
      {
        region: 1,
        list: 1,
        items: expected.relationships.length,
        links: expected.relationships.length,
      },
      { region: regionCount, list: listCount, items: itemCount, links: linkCount },
    );

    const strip = page.locator('[data-site-connections]').first();
    const links = strip.locator('li a');
    const linkActual = [];
    for (let index = 0; index < expected.relationships.length; index += 1) {
      const relationship = expected.relationships[index];
      const link = links.nth(index);
      const actual = {
        text: await link.textContent(),
        href: await link.getAttribute('href'),
        note: await strip.locator('li').nth(index).locator('p').textContent(),
      };
      linkActual.push(actual);
    }
    addCheck(
      cell,
      'linkText',
      'LINK-TEXT',
      linkActual.length === expected.relationships.length &&
        linkActual.every((actual, index) => {
          const relationship = expected.relationships[index];
          return (
            actual.text === relationship.name &&
            actual.href === relationship.href &&
            !/\b(here|click|link|more)\b/i.test(actual.text ?? '') &&
            actual.note === relationship.note
          );
        }),
      expected.relationships.map(({ name, href, note }) => ({ text: name, href, note })),
      linkActual,
    );

    const before = await page.evaluate(pageGeometry);
    addCheck(
      cell,
      'order',
      'ORDER',
      before.order.found &&
        before.order.workbenchBeforeStrip &&
        before.order.stripBeforeFooter &&
        before.order.stripInMain,
      {
        workbenchBeforeStrip: true,
        stripBeforeFooter: true,
        stripInMain: true,
      },
      before.order,
    );
    cell.rectangles.strip = before.stripRect;
    cell.rectangles.links = before.links.map((_link, index) => before.links[index].rect);
    cell.rectangles.workbenchFocusables = before.workbenchFocusables.map(
      (element) => element.rect,
    );
    cell.rectangles.footerFocusables = before.footerFocusables.map((element) => element.rect);

    const lastFocusable = before.workbenchFocusables.at(-1);
    const firstFooter = before.footerFocusables[0];
    let tabWalk = [];
    let tabPass = false;
    let focusOutline = null;
    if (lastFocusable !== undefined && firstFooter !== undefined) {
      await page.evaluate(() => {
        const focusableSelector =
          'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])';
        const workbench = document.querySelector('[data-site-workbench]');
        if (workbench === null) throw new Error('workbench missing');
        const elements = [...workbench.querySelectorAll(focusableSelector)].filter((element) => {
          if (element.getClientRects().length === 0 || element.closest('[inert]') !== null) {
            return false;
          }
          let opacity = 1;
          for (let current = element; current !== null; current = current.parentElement) {
            const style = getComputedStyle(current);
            if (style.display === 'none' || style.visibility === 'hidden') return false;
            opacity *= Number(style.opacity === '' ? 1 : style.opacity);
          }
          return opacity > 0;
        });
        const last = elements.at(-1);
        if (!(last instanceof HTMLElement)) throw new Error('workbench focusable missing');
        last.focus({ preventScroll: true });
      });

      await page.keyboard.press('Tab');
      const firstActive = await activeDescriptor(page);
      const firstIsLink = await links
        .first()
        .evaluate((element) => document.activeElement === element);
      tabWalk.push({ expected: 'strip[0]', active: firstActive, pass: firstIsLink });
      focusOutline = await links.first().evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          outlineStyle: style.outlineStyle,
          outlineWidth: style.outlineWidth,
          outlineColor: style.outlineColor,
          outlineOffset: style.outlineOffset,
          focusVisible: element.matches(':focus-visible'),
        };
      });
      const focusShot = resolve(
        out,
        `T005-screenshot-focus-${SLUG_SHORT.get(slug)}-${viewport.name}-${scheme}.png`,
      );
      await strip.screenshot({ path: focusShot });
      cell.screenshots.focus = focusShot.split('/').at(-1);

      for (let index = 1; index < expected.relationships.length; index += 1) {
        await page.keyboard.press('Tab');
        const active = await activeDescriptor(page);
        const pass = await links
          .nth(index)
          .evaluate((element) => document.activeElement === element);
        tabWalk.push({ expected: `strip[${index}]`, active, pass });
      }
      await page.keyboard.press('Tab');
      const footerActive = await activeDescriptor(page);
      const firstIsFooter = await page.evaluate(() => {
        const focusableSelector =
          'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])';
        const footer = document.querySelector('footer');
        if (footer === null) return false;
        const elements = [...footer.querySelectorAll(focusableSelector)].filter((element) => {
          if (element.getClientRects().length === 0 || element.closest('[inert]') !== null) {
            return false;
          }
          let opacity = 1;
          for (let current = element; current !== null; current = current.parentElement) {
            const style = getComputedStyle(current);
            if (style.display === 'none' || style.visibility === 'hidden') return false;
            opacity *= Number(style.opacity === '' ? 1 : style.opacity);
          }
          return opacity > 0;
        });
        return document.activeElement === elements[0];
      });
      tabWalk.push({ expected: 'footer[0]', active: footerActive, pass: firstIsFooter });
      tabPass = tabWalk.every((step) => step.pass);
    }
    addCheck(
      cell,
      'tabOrder',
      'TAB-ORDER',
      tabPass,
      {
        from: lastFocusable ?? null,
        to: ['strip[0]', ...expected.relationships.slice(1).map((_item, index) => `strip[${index + 1}]`), 'footer[0]'],
      },
      tabWalk,
    );

    const outlineWidth = focusOutline === null ? 0 : Number.parseFloat(focusOutline.outlineWidth);
    addCheck(
      cell,
      'focusRing',
      'FOCUS-RING',
      focusOutline?.outlineStyle === 'solid' && Number.isFinite(outlineWidth) && outlineWidth >= 2,
      { outlineStyle: 'solid', outlineWidthPx: 2 },
      focusOutline,
    );

    const tapActual = before.links.map((link) => ({
      ...link,
      pass: link.rect.width >= 44 && link.rect.height >= 44,
    }));
    addCheck(
      cell,
      'tapTarget',
      'TAP-TARGET',
      tapActual.length === expected.relationships.length && tapActual.every((link) => link.pass),
      { minWidth: 44, minHeight: 44 },
      tapActual,
    );
    cell.rectangles.links = before.links.map((link) => link.rect);

    addCheck(
      cell,
      'horizontalScroll',
      'NO-HSCROLL',
      before.scrollWidth <= before.clientWidth,
      { scrollWidthAtMost: before.clientWidth },
      { scrollWidth: before.scrollWidth, clientWidth: before.clientWidth },
    );

    const overlap = await page.evaluate(pageGeometry);
    const intersections = overlap.labels
      .filter((label) => label.painted && quadsIntersect(overlap.stripQuad, label.quad))
      .map((label) => ({ marker: label.marker, key: label.key, kind: label.kind, quad: label.quad }));
    addCheck(
      cell,
      'overlap',
      'NO-OVERLAP',
      overlap.viewerFound === true && intersections.length === 0,
      { intersections: 0 },
      {
        viewerFound: overlap.viewerFound,
        visibleLabels: overlap.labels.filter((label) => label.painted).length,
        intersections: intersections.length,
        intersections,
      },
    );
    cell.rectangles.strip = overlap.stripRect;
    cell.rectangles.stripQuad = overlap.stripQuad;
    cell.rectangles.labels = overlap.labels;

    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    });
    const stripShot = resolve(
      out,
      `T005-screenshot-strip-${SLUG_SHORT.get(slug)}-${viewport.name}-${scheme}.png`,
    );
    await strip.screenshot({ path: stripShot });
    cell.screenshots.strip = stripShot.split('/').at(-1);
  } finally {
    await context.close();
  }
  return cell;
}

async function runNoJs(browser, baseUrl, slug, viewport) {
  const cell = {
    cellId: `${slug}-${viewport.name}-no-js`,
    slug,
    viewport: `${viewport.width}x${viewport.height}`,
    colorScheme: 'light',
    javaScriptEnabled: false,
    checks: [],
    rectangles: {},
  };
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: viewport.mobile,
    hasTouch: viewport.mobile,
    deviceScaleFactor: 1,
    colorScheme: 'light',
    javaScriptEnabled: false,
  });
  const page = await context.newPage();
  try {
    await page.goto(`${baseUrl}/projects/${slug}`, { waitUntil: 'domcontentloaded' });
    const actual = await page.evaluate(() => {
      const outline = document.querySelector('[data-site-outline]');
      const strip = document.querySelector('[data-site-connections]');
      const footer = document.querySelector('footer');
      const box = (element) => {
        if (element === null) return null;
        const rect = element.getBoundingClientRect();
        return {
          x: rect.left + window.scrollX,
          y: rect.top + window.scrollY,
          width: rect.width,
          height: rect.height,
        };
      };
      return {
        found: outline !== null && strip !== null && footer !== null,
        outlineBeforeStrip:
          outline !== null &&
          strip !== null &&
          (outline.compareDocumentPosition(strip) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
        stripBeforeFooter:
          strip !== null &&
          footer !== null &&
          (strip.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
        rectangles: { outline: box(outline), strip: box(strip), footer: box(footer) },
      };
    });
    cell.rectangles = actual.rectangles;
    addCheck(
      cell,
      'order',
      'ORDER',
      actual.found && actual.outlineBeforeStrip && actual.stripBeforeFooter,
      { outlineBeforeStrip: true, stripBeforeFooter: true },
      {
        found: actual.found,
        outlineBeforeStrip: actual.outlineBeforeStrip,
        stripBeforeFooter: actual.stripBeforeFooter,
      },
    );
  } finally {
    await context.close();
  }
  return cell;
}

function markdownTable(cells) {
  const header = [
    '| cell |',
    ...CHECKS.map(([, label]) => ` ${label} |`),
    ' result |',
  ].join('');
  const divider = ['|---|', ...CHECKS.map(() => '---|'), '---|'].join('');
  const lines = [header, divider];
  for (const cell of cells) {
    const interactive = cell.javaScriptEnabled !== false;
    const columns = CHECKS.map(([id]) => {
      if (!interactive && id !== 'order') return 'n/a';
      return checkPass(cell, id) ? 'PASS' : 'FAIL';
    });
    const pass = cell.checks.every((check) => check.pass);
    lines.push(`| ${cell.cellId} | ${columns.join(' | ')} | ${pass ? 'PASS' : 'FAIL'} |`);
  }
  return lines.join('\n');
}

async function main() {
  const { baseUrl, out } = parseArgs(process.argv.slice(2));
  const expected = loadExpected();
  const require = createRequire(resolve(REPO, 'tools/perf/package.json'));
  const { chromium } = require('playwright');
  const commit = execFileSync('git', ['-C', REPO, 'rev-parse', 'HEAD'], {
    encoding: 'utf8',
  }).trim();
  mkdirSync(out, { recursive: true });

  const browser = await chromium.launch();
  const chromiumVersion = browser.version();
  const interactiveCells = [];
  const noJsCells = [];
  try {
    for (const slug of SLUGS) {
      for (const viewport of VIEWPORTS) {
        for (const scheme of SCHEMES) {
          try {
            interactiveCells.push(
              await runCell(browser, baseUrl, slug, expected.get(slug), viewport, scheme, out),
            );
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            const cell = {
              cellId: `${slug}-${viewport.name}-${scheme}`,
              slug,
              viewport: `${viewport.width}x${viewport.height}`,
              colorScheme: scheme,
              checks: [
                {
                  id: 'internal',
                  label: 'INTERNAL',
                  pass: false,
                  expected: 'cell completes',
                  actual: message,
                },
              ],
              rectangles: {},
              screenshots: {},
            };
            interactiveCells.push(cell);
          }
        }
      }
      try {
        noJsCells.push(await runNoJs(browser, baseUrl, slug, VIEWPORTS[0]));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        noJsCells.push({
          cellId: `${slug}-390-no-js`,
          slug,
          viewport: '390x844',
          colorScheme: 'light',
          javaScriptEnabled: false,
          checks: [
            {
              id: 'internal',
              label: 'INTERNAL',
              pass: false,
              expected: 'no-JS cell completes',
              actual: message,
            },
          ],
          rectangles: {},
        });
      }
    }
  } finally {
    await browser.close();
  }

  const allCells = [...interactiveCells, ...noJsCells];
  const pass = allCells.every(
    (cell) => cell.checks.length > 0 && cell.checks.every((check) => check.pass),
  );
  const summary = {
    kind: 'connections-probe',
    version: 1,
    baseUrl,
    chromium: chromiumVersion,
    commit,
    cells: interactiveCells.map((cell) => ({
      ...cell,
      pass: cell.checks.length > 0 && cell.checks.every((check) => check.pass),
    })),
    noJs: noJsCells.map((cell) => ({
      ...cell,
      pass: cell.checks.length > 0 && cell.checks.every((check) => check.pass),
    })),
    pass,
    failures: allCells
      .flatMap((cell) =>
        cell.checks
          .filter((check) => !check.pass)
          .map((check) => ({ cellId: cell.cellId, check: check.id })),
      )
      .filter(Boolean),
  };
  writeFileSync(resolve(out, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);

  const script = relative(process.cwd(), resolve(process.argv[1]));
  const command = ['node', script, ...process.argv.slice(2)].join(' ');
  console.log(
    `# command: ${command} | base: ${baseUrl} | chromium: ${chromiumVersion} | commit: ${commit}`,
  );
  console.log('');
  console.log(markdownTable(allCells));
  console.log('');
  if (!pass) {
    for (const cell of allCells) {
      for (const check of cell.checks.filter((item) => !item.pass)) {
        console.log(
          `FAIL ${cell.cellId} ${check.label}: expected ${JSON.stringify(check.expected)} actual ${JSON.stringify(check.actual)}`,
        );
      }
    }
  }
  console.log(
    pass
      ? `CONNECTIONS-PROBE PASS ${interactiveCells.length} cells`
      : 'CONNECTIONS-PROBE FAIL',
  );
  if (!pass) process.exitCode = 6;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main();
}
