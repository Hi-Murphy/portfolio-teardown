import { readFileSync } from 'node:fs';

import type { ProjectInput } from '../src/index';

export function loadJson(relPath: string): unknown {
  return JSON.parse(readFileSync(new URL(relPath, import.meta.url), 'utf8'));
}

export function minimalProject(): ProjectInput {
  return {
    schemaVersion: 1,
    meta: { slug: 'demo', name: 'Demo' },
    layers: [
      {
        id: 'core',
        name: 'Core',
        components: [{ id: 'app', name: 'App' }],
      },
    ],
  };
}
