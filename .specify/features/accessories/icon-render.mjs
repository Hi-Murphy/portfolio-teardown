// S19 W4/W5.5: render /icon.svg at 16/32 px and /apple-touch-icon.png at 180 px in light and dark,
// plus the inline glyph in the hero identity line and the footer. Writes PNGs and a pixel report.
// usage: node icon-render.mjs <repo> <baseUrl> <outDir>
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const [, , repoArg, baseUrlArg, outArg] = process.argv;
if (!repoArg || !baseUrlArg || !outArg) {
  console.error('usage: node icon-render.mjs <repo> <baseUrl> <outDir>');
  process.exit(2);
}

const require = createRequire(resolve(repoArg, 'tools/perf/package.json'));
const { chromium } = require('playwright');
const baseUrl = baseUrlArg.replace(/\/$/, '');
const outDir = resolve(outArg);
await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();

// Glyph bounds on the 32-unit sheet: x 3..29, y 12..20. "Clipped" = an ink pixel touching the
// image edge, or the glyph's outer columns/rows missing.
async function renderIcon(scheme, size, path) {
  const context = await browser.newContext({ colorScheme: scheme, deviceScaleFactor: 1 });
  const page = await context.newPage();
  // Same origin as the icon, so the canvas readback is not tainted.
  await page.goto(`${baseUrl}/robots.txt`);
  await page.evaluate(
    ({ src, s }) => {
      document.documentElement.innerHTML = `<body style="margin:0;background:#808080"><img id="i" src="${src}" width="${s}" height="${s}"></body>`;
    },
    { src: `${baseUrl}${path}`, s: size },
  );
  await page.waitForFunction(() => document.getElementById('i').complete);
  const stats = await page.evaluate((s) => {
    const img = document.getElementById('i');
    const canvas = document.createElement('canvas');
    canvas.width = s;
    canvas.height = s;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, s, s);
    const data = ctx.getImageData(0, 0, s, s).data;
    const at = (x, y) => {
      const i = (y * s + x) * 4;
      return [data[i], data[i + 1], data[i + 2], data[i + 3]];
    };
    const centre = at(Math.floor(s / 2), Math.floor(s / 2));
    const corner = at(Math.floor(s * 0.25), Math.floor(s * 0.2));
    const lum = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const ground = lum(corner);
    let minX = s;
    let maxX = -1;
    let minY = s;
    let maxY = -1;
    for (let y = 0; y < s; y += 1) {
      for (let x = 0; x < s; x += 1) {
        const p = at(x, y);
        if (p[3] > 0 && Math.abs(lum(p) - ground) > 60) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }
    return { natural: img.naturalWidth, centre, corner, glyphBox: [minX, minY, maxX, maxY] };
  }, size);
  const shot = await page.locator('#i').screenshot();
  await writeFile(resolve(outDir, `icon-${path.replace(/[^a-z]/gi, '')}-${size}-${scheme}.png`), shot);
  await context.close();
  return stats;
}

console.log(`# icon-render | base ${baseUrl}`);
console.log('| asset | size | scheme | centre rgba | ground rgba | glyph box x0,y0,x1,y1 | expected box | clipped |');
console.log('|---|---:|---|---|---|---|---|---|');
for (const [path, sizes] of [
  ['/icon.svg', [16, 32]],
  ['/apple-touch-icon.png', [180]],
]) {
  for (const size of sizes) {
    for (const scheme of ['light', 'dark']) {
      const stats = await renderIcon(scheme, size, path);
      const k = size / 32;
      const expected = [3 * k, 12 * k, 29 * k, 20 * k].map((v) => Math.round(v));
      const [x0, y0, x1, y1] = stats.glyphBox;
      const clipped = x0 <= 0 || y0 <= 0 || x1 >= size - 1 || y1 >= size - 1 || x1 < 0;
      console.log(
        `| ${path} | ${size} | ${scheme} | ${stats.centre.join(',')} | ${stats.corner.join(',')} | ${stats.glyphBox.join(',')} | ${expected.join(',')} | ${clipped ? 'YES' : 'no'} |`,
      );
    }
  }
}

// Inline glyph: hero identity line and footer, 390x844, light and dark.
console.log('\n| place | scheme | glyph px | aria-hidden | colour = name colour |');
console.log('|---|---|---|---|---|');
for (const scheme of ['light', 'dark']) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme: scheme,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/`, { waitUntil: 'load' });
  for (const [place, selector] of [
    ['hero', '[data-site-hero] p.font-semibold'],
    ['footer', 'footer a[href="/"]'],
  ]) {
    const line = page.locator(selector).first();
    const info = await line.evaluate((element) => {
      const svg = element.querySelector('svg');
      const rect = svg.getBoundingClientRect();
      return {
        size: `${rect.width}x${rect.height}`,
        hidden: svg.getAttribute('aria-hidden'),
        same: getComputedStyle(svg).color === getComputedStyle(element).color,
      };
    });
    await line.scrollIntoViewIfNeeded();
    await writeFile(resolve(outDir, `glyph-${place}-${scheme}.png`), await line.screenshot());
    console.log(`| ${place} | ${scheme} | ${info.size} | ${info.hidden} | ${info.same} |`);
  }
  await context.close();
}

await browser.close();
