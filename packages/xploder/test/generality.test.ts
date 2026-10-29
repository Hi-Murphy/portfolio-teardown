import { expect, test } from 'vitest';
import { z } from 'zod';

import { ProjectSchema, parseProject, parseTechRegistry } from '../src/index';
import { projectBJson, techRegistryJson } from './fixtures';

test('exports the v1 project schema fingerprint', () => {
  expect(z.toJSONSchema(ProjectSchema, { io: 'input' })).toMatchSnapshot('project-schema-v1');
});

const registry = parseTechRegistry(techRegistryJson);
const pipeline = parseProject(projectBJson, { registry });

test('fixture B parses as a pipeline with the unchanged registry-backed schema', () => {
  expect(pipeline.meta).toMatchObject({
    slug: 'ledgerline',
    name: 'Ledgerline',
  });
  expect(pipeline.layers).toHaveLength(4);
  expect(pipeline.flows).toHaveLength(1);
});

test('fixture B preserves pipeline layer order through its flow path', () => {
  expect(pipeline.layers.map((layer) => layer.id)).toEqual([
    'ingest',
    'normalize',
    'validate',
    'report',
  ]);

  const layerIndexByComponentId = new Map(
    pipeline.layers.flatMap((layer, layerIndex) =>
      layer.components.map((component) => [component.id, layerIndex] as const),
    ),
  );
  const flow = pipeline.flows[0];

  expect(flow).toBeDefined();
  if (!flow) throw new Error('Expected fixture B to define a flow');

  const pathLayerIndexes = flow.path.map((componentId) => {
    const layerIndex = layerIndexByComponentId.get(componentId);

    expect(layerIndex).toBeDefined();
    if (layerIndex === undefined) throw new Error(`Missing layer for component "${componentId}"`);

    return layerIndex;
  });

  pathLayerIndexes.forEach((layerIndex, pathIndex) => {
    if (pathIndex > 0) {
      expect(layerIndex).toBeGreaterThan(pathLayerIndexes[pathIndex - 1] ?? -1);
    }
  });
  expect(new Set(pathLayerIndexes)).toEqual(new Set(pipeline.layers.keys()));

  const componentIds = pipeline.layers.flatMap((layer) =>
    layer.components.map((component) => component.id),
  );
  expect(componentIds.filter((id) => /screen|view|ui|page/.test(id))).toEqual([]);
});
