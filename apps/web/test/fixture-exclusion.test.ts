import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

const PRODUCTION_OUT = fileURLToPath(new URL('../out/', import.meta.url));
const FIXTURE_OUT = fileURLToPath(new URL('../../../out-fixtures/', import.meta.url));
const FIXTURE_MARKER = 'data-perf-fixture';
const FIXTURE_ROUTES = ['fps-calibration', 'dev/engine'];

function collectFiles(root: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectFiles(path));
    } else if (entry.isFile()) {
      files.push(path);
    }
  }

  return files;
}

describe('calibration fixture exclusion', () => {
  test.skipIf(!existsSync(PRODUCTION_OUT))(
    'production export has no fixture route or marker',
    () => {
      expect(existsSync(join(PRODUCTION_OUT, 'fixtures'))).toBe(false);
      expect(existsSync(join(PRODUCTION_OUT, 'dev'))).toBe(false);

      for (const file of collectFiles(PRODUCTION_OUT)) {
        const contents = readFileSync(file, 'utf8');

        expect(contents).not.toContain(FIXTURE_MARKER);

        for (const route of FIXTURE_ROUTES) {
          expect(file).not.toContain(route);
          expect(contents).not.toContain(route);
        }
      }
    },
  );

  test.skipIf(!existsSync(FIXTURE_OUT))(
    'fixture export contains the marker as a positive control',
    () => {
      const files = collectFiles(FIXTURE_OUT);
      const contents = files.map((file) => readFileSync(file, 'utf8'));

      expect(contents.some((file) => file.includes(`${FIXTURE_MARKER}="fps-calibration"`))).toBe(
        true,
      );
      expect(contents.some((file) => file.includes(`${FIXTURE_MARKER}="engine"`))).toBe(true);
    },
  );
});
