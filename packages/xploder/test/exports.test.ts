import { expect, test } from 'vitest';

import packageJson from '../package.json';

const EXPORT_KEYS = ['.', './motion', './theme', './layout', './react', './fixtures'];

const ROOT_EXPORTS = [
  'XPLODER_VERSION',
  'COMPONENT_KINDS',
  'COMPONENT_STATUSES',
  'SCHEMA_VERSION',
  'TECH_CATEGORIES',
  'TECH_COLOR_REFS',
  'IdSchema',
  'LinkSchema',
  'MetricSchema',
  'TechRegistrySchema',
  'TechSchema',
  'ComponentSchema',
  'FlowSchema',
  'LayerSchema',
  'MetaSchema',
  'ProjectSchema',
  'StorySchema',
  'createProjectSchema',
  'ProjectValidationError',
  'TechRegistryValidationError',
  'XploderValidationError',
  'defineProject',
  'defineTechRegistry',
  'parseProject',
  'parseTechRegistry',
  'safeParseProject',
];

test('exports every public entry point', () => {
  expect(Object.keys(packageJson.exports).sort()).toEqual([...EXPORT_KEYS].sort());
});

test('keeps the S2 root API unchanged', async () => {
  const root = await import('../src/index');

  expect(Object.keys(root).sort()).toEqual([...ROOT_EXPORTS].sort());
});
