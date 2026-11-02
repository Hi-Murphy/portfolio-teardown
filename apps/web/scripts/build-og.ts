import { createHash } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

import { appleIconElement } from '../seo/icon';
import { cardElement } from '../seo/og/card';
import { cardModel } from '../seo/og/card-model';
import { renderPng } from '../seo/og/render';
import { INDEXABLE_ROUTES } from '../seo/routes';

const APP_WEB_ROOT = process.cwd();
const PUBLIC_ROOT = resolve(APP_WEB_ROOT, 'public');
const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;
const APPLE_ICON_SIZE = 180;

async function writePng(path: string, bytes: Uint8Array): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, bytes);

  const sha256 = createHash('sha256').update(bytes).digest('hex');
  console.log(`${relative(APP_WEB_ROOT, path)} ${bytes.byteLength} bytes ${sha256}`);
}

await rm(resolve(PUBLIC_ROOT, 'og'), { recursive: true, force: true });
await rm(resolve(PUBLIC_ROOT, 'apple-touch-icon.png'), { force: true });

for (const route of INDEXABLE_ROUTES) {
  const bytes = await renderPng(cardElement(cardModel(route)), {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  });

  await writePng(resolve(PUBLIC_ROOT, route.ogImagePath.slice(1)), bytes);
}

const appleIconBytes = await renderPng(appleIconElement(), {
  width: APPLE_ICON_SIZE,
  height: APPLE_ICON_SIZE,
});

await writePng(resolve(PUBLIC_ROOT, 'apple-touch-icon.png'), appleIconBytes);
