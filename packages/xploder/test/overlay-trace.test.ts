import { describe, expect, test } from 'vitest';

import { parseProject, parseTechRegistry, type Project } from '../src/index';
import { octilinearHop, traceRoute, type Vec2 } from '../src/overlay/trace';
import { projectAJson, projectBJson, projectCJson, techRegistryJson } from './fixtures';

const registry = parseTechRegistry(techRegistryJson);
const projectA = parseProject(projectAJson, { registry });
const projectB = parseProject(projectBJson, { registry });
const projectC = parseProject(projectCJson, { registry });
const EPSILON = 1e-9;

const FLOW_CASES = [
  ['A live-update', projectA, 'live-update'],
  ['A offline-read', projectA, 'offline-read'],
  ['B nightly-reconciliation', projectB, 'nightly-reconciliation'],
  ['C pickup-ready', projectC, 'pickup-ready'],
  ['C push-failed', projectC, 'push-failed'],
] as const satisfies readonly (readonly [string, Project, string])[];

function hashId(id: string): number {
  let hash = 2_166_136_261;

  for (let index = 0; index < id.length; index += 1) {
    hash = Math.imul(hash ^ id.charCodeAt(index), 16_777_619);
  }

  return hash >>> 0;
}

function anchorsFor(project: Project): Map<string, Vec2> {
  const anchors = new Map<string, Vec2>();

  for (const component of project.layers.flatMap((layer) => layer.components)) {
    const hash = hashId(component.id);

    anchors.set(component.id, [
      20 + ((hash & 0xffff) / 0xffff) * 1_200,
      20 + (((hash >>> 16) & 0xffff) / 0xffff) * 800,
    ]);
  }

  return anchors;
}

function flowFor(project: Project, flowId: string): Project['flows'][number] {
  const flow = project.flows.find((candidate) => candidate.id === flowId);

  if (flow === undefined) {
    throw new Error(`Missing flow "${flowId}".`);
  }

  return flow;
}

function expectOctilinear(points: readonly Vec2[]): void {
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1];
    const to = points[index];

    if (from === undefined || to === undefined) {
      throw new Error('Missing hop point.');
    }

    const dx = Math.abs(to[0] - from[0]);
    const dy = Math.abs(to[1] - from[1]);

    expect(dx === 0 || dy === 0 || Math.abs(dx - dy) <= EPSILON).toBe(true);
  }
}

describe.each(FLOW_CASES)('traceRoute (%s)', (_label, project, flowId) => {
  const flow = flowFor(project, flowId);
  const anchors = anchorsFor(project);

  test.each(flow.path.map((_, index) => index))(
    'step %i follows the path prefix with octilinear hops',
    (step) => {
      const route = traceRoute(flow.path, step, anchors);

      expect(route.vertices).toStrictEqual(flow.path.slice(0, step + 1));
      expect(route.hops).toHaveLength(step);
      expect(route.points[0]).toStrictEqual(anchors.get(flow.path[0] ?? ''));
      expect(route.points[route.points.length - 1]).toStrictEqual(
        anchors.get(flow.path[step] ?? ''),
      );

      route.hops.forEach((hop, index) => {
        expect(hop.from).toBe(flow.path[index]);
        expect(hop.to).toBe(flow.path[index + 1]);
        expect(hop.points[0]).toStrictEqual(anchors.get(hop.from));
        expect(hop.points[hop.points.length - 1]).toStrictEqual(anchors.get(hop.to));
        expectOctilinear(hop.points);
      });

      expectOctilinear(route.points);
    },
  );

  test('throws when a visited id has no anchor', () => {
    const missing = new Map(anchors);

    missing.delete(flow.path[1] ?? '');

    expect(() => traceRoute(flow.path, flow.path.length - 1, missing)).toThrow(
      /Missing overlay anchor/,
    );
  });
});

describe('octilinearHop', () => {
  test('routes primarily horizontally with a 45-degree finish', () => {
    expect(octilinearHop([0, 0], [10, 4])).toStrictEqual([
      [0, 0],
      [6, 0],
      [10, 4],
    ]);
  });

  test('routes primarily vertically with a 45-degree finish', () => {
    expect(octilinearHop([0, 0], [2, 10])).toStrictEqual([
      [0, 0],
      [0, 8],
      [2, 10],
    ]);
  });

  test('drops zero-length segments', () => {
    expect(octilinearHop([3, 4], [3, 4])).toStrictEqual([[3, 4]]);
    expect(octilinearHop([0, 0], [5, 0])).toStrictEqual([
      [0, 0],
      [5, 0],
    ]);
    expect(octilinearHop([0, 0], [0, 5])).toStrictEqual([
      [0, 0],
      [0, 5],
    ]);
    expect(octilinearHop([0, 0], [5, 5])).toStrictEqual([
      [0, 0],
      [5, 5],
    ]);
  });
});
