import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { collectSourceFiles } from './source-scan';

const WEB_ROOT = fileURLToPath(new URL('..', import.meta.url));
const STAGE_PATH = fileURLToPath(new URL('../build/stage-3d.ts', import.meta.url));
const BOOT_PATH = fileURLToPath(new URL('../components/boot-3d.ts', import.meta.url));
const STAGE_ENTRY = /\(\)\s*=>\s*import\(\s*(['"])([^'"]+)\1\s*\)/g;

describe('staged 3D modules', () => {
  test('contains exactly the bare three and R3F dynamic imports', () => {
    const source = readFileSync(STAGE_PATH, 'utf8').replace(/^\s*\/\/.*$/gm, '');
    const entries = [...source.matchAll(STAGE_ENTRY)];
    const remainder = source
      .replace(STAGE_ENTRY, '')
      .replace(/export\s+const\s+STAGES_3D\s*=\s*\[/, '')
      .replace(/\]\s*as\s+const\s*;?/, '')
      .replace(/[\s,]+/g, '');

    expect(entries.map((entry) => entry[2])).toEqual(['three', '@react-three/fiber']);
    expect(source.match(/\bimport\s*\(/g)).toHaveLength(2);
    expect(remainder).toBe('');
  });

  test('is imported only by boot-3d.ts', () => {
    const files = collectSourceFiles(WEB_ROOT);
    const references = files.filter((file) => readFileSync(file, 'utf8').includes('stage-3d'));

    expect(references).toEqual([BOOT_PATH]);
  });
});
