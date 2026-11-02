import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface FontOptions {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 600;
  style: 'normal';
}

const FONTS_DIRECTORY = join(process.cwd(), 'seo/og/fonts');

let fontsPromise: Promise<FontOptions[]> | undefined;

async function readFont(filename: string): Promise<ArrayBuffer> {
  const bytes = new Uint8Array(await readFile(join(FONTS_DIRECTORY, filename)));

  return bytes.buffer;
}

export function loadFonts(): Promise<FontOptions[]> {
  fontsPromise ??= Promise.all([
    readFont('IBMPlexSans-SemiBold.ttf'),
    readFont('IBMPlexMono-Regular.ttf'),
  ]).then(([sans, mono]) => [
    { name: 'IBM Plex Sans', data: sans, weight: 600, style: 'normal' },
    { name: 'IBM Plex Mono', data: mono, weight: 400, style: 'normal' },
  ]);

  return fontsPromise;
}
