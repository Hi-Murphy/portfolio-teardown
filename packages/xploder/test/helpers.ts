import type { ProjectInput } from '../src/index';

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
