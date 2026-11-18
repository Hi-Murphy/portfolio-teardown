// S19 W3/W5: fold line at 390x844, card order, card/chip geometry and CLS on / and /projects.
// usage: node fold-and-cards.mjs <repo> <baseUrl> <label>
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const [, , repoArg, baseUrlArg, label = 'run'] = process.argv;
if (!repoArg || !baseUrlArg) {
  console.error('usage: node fold-and-cards.mjs <repo> <baseUrl> <label>');
  process.exit(2);
}

const require = createRequire(resolve(repoArg, 'tools/perf/package.json'));
const { chromium } = require('playwright');
const baseUrl = baseUrlArg.replace(/\/$/, '');
const browser = await chromium.launch();

async function measure(path, width, height, mobile) {
  const context = await browser.newContext({
    viewport: { width, height },
    isMobile: mobile,
    hasTouch: mobile,
    deviceScaleFactor: mobile ? 3 : 1,
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.__cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__cls += entry.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto(`${baseUrl}${path}`, { waitUntil: 'load' });
  await page.waitForTimeout(3000);

  const result = await page.evaluate(() => {
    const top = (element) =>
      element === null ? null : Math.round(element.getBoundingClientRect().top + window.scrollY);
    const sections = [...document.querySelectorAll('[data-home-section]')].map((section) => ({
      id: section.getAttribute('data-home-section'),
      top: top(section),
      heading: top(section.querySelector('h1, h2')),
    }));
    const cards = [...document.querySelectorAll('[data-site-card]')].map((card) => {
      const rect = card.getBoundingClientRect();
      const chips = [...card.querySelectorAll('ul[aria-label="Tech"] li')];
      const chipList = card.querySelector('ul[aria-label="Tech"]');
      return {
        slug: card.getAttribute('data-site-card'),
        top: Math.round(rect.top + window.scrollY),
        height: Math.round(rect.height * 10) / 10,
        chips: chips.map((chip) => chip.querySelector('span:not([aria-hidden])')?.textContent),
        chipRowHeight: chipList === null ? 0 : Math.round(chipList.getBoundingClientRect().height),
      };
    });
    return { sections, cards, cls: window.__cls, viewport: window.innerHeight };
  });
  await context.close();
  return result;
}

console.log(`# fold-and-cards ${label} | base ${baseUrl}`);
for (const [path, width, height, mobile] of [
  ['/', 390, 844, true],
  ['/', 1440, 900, false],
  ['/projects', 390, 844, true],
  ['/projects', 1440, 900, false],
]) {
  const result = await measure(path, width, height, mobile);
  console.log(`\n## ${path} ${width}x${height}  CLS ${result.cls.toFixed(4)}`);
  if (result.sections.length > 0) {
    console.log('| section | top px | heading top px | above fold |');
    console.log('|---|---:|---:|---|');
    for (const section of result.sections) {
      console.log(
        `| ${section.id} | ${section.top} | ${section.heading ?? '-'} | ${section.top < height ? 'yes' : 'no'} |`,
      );
    }
  }
  console.log('| card | top px | height px | chip row px | chips |');
  console.log('|---|---:|---:|---:|---|');
  for (const card of result.cards) {
    console.log(
      `| ${card.slug} | ${card.top} | ${card.height} | ${card.chipRowHeight} | ${card.chips.join(' · ') || '(none)'} |`,
    );
  }
}

await browser.close();
