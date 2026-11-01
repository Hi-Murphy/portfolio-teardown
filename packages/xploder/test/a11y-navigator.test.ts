import { describe, expect, test } from 'vitest';

import { navigatorItems, navigatorKey } from '../src/a11y/navigator';
import { partNumber } from '../src/overlay/parts';
import { parseProject, parseTechRegistry } from '../src/index';
import { projectAJson, projectBJson, projectCJson, techRegistryJson } from './fixtures';

const registry = parseTechRegistry(techRegistryJson);
const projectA = parseProject(projectAJson, { registry });
const projectB = parseProject(projectBJson, { registry });
const projectC = parseProject(projectCJson, { registry });

function itemLabels(project: Parameters<typeof navigatorItems>[0]): readonly string[] {
  return navigatorItems(project).map((item) => `${item.itemNumber} ${item.id}`);
}

function s6Numbers(project: Parameters<typeof navigatorItems>[0]): readonly string[] {
  return project.layers.flatMap((layer, layerIndex) =>
    layer.components.map((_component, componentIndex) => partNumber(layerIndex, componentIndex)),
  );
}

describe('navigator order', () => {
  test('orders fixture A in item-number order', () => {
    expect(itemLabels(projectA)).toEqual([
      '1.1 beachgoer',
      '1.2 tide-chart-screen',
      '1.3 forecast-details-panel',
      '2.1 tide-view-model',
      '3.1 tide-repository',
      '3.2 live-tide-client',
      '3.3 tide-cache',
      '4.1 tide-feed',
    ]);
  });

  test('orders fixture B in item-number order', () => {
    expect(itemLabels(projectB)).toEqual([
      '1.1 partner-csv-drop',
      '2.1 column-normalizer',
      '3.1 ledger-validator',
      '4.1 reconciliation-ledger',
      '4.2 settlement-operator',
    ]);
  });

  test('orders fixture C in item-number order', () => {
    expect(itemLabels(projectC)).toEqual([
      '1.1 recipient',
      '1.2 pickup-app',
      '2.1 pickup-api',
      '2.2 session-gate',
      '3.1 booking-service',
      '3.2 notifier',
      '3.3 retry-scheduler',
      '3.4 slot-planner',
      '3.5 audit-trail',
      '4.1 locker-registry',
      '4.2 dead-letter-store',
      '5.1 push-gateway',
      '5.2 locker-hardware',
    ]);
  });

  test.each([
    ['A', projectA, 8],
    ['B', projectB, 5],
    ['C', projectC, 13],
  ] as const)(
    'fixture %s numbers every item exactly as the S6 parts model',
    (_name, project, count) => {
      const items = navigatorItems(project);

      expect(items).toHaveLength(count);
      expect(items.map((item) => item.itemNumber)).toEqual(s6Numbers(project));
    },
  );

  test('carries the data needed by the navigator DOM', () => {
    expect(navigatorItems(projectA)[0]).toStrictEqual({
      id: 'beachgoer',
      name: 'Beachgoer',
      layerId: 'ui',
      layerName: 'Interface',
      kind: 'actor',
      itemNumber: '1.1',
    });
  });
});

describe('navigator key map', () => {
  test('moves down and up with wrapping', () => {
    expect(navigatorKey('ArrowDown', 0, 8)).toStrictEqual({ type: 'move', index: 1 });
    expect(navigatorKey('ArrowDown', 7, 8)).toStrictEqual({ type: 'move', index: 0 });
    expect(navigatorKey('ArrowUp', 0, 8)).toStrictEqual({ type: 'move', index: 7 });
    expect(navigatorKey('ArrowUp', 7, 8)).toStrictEqual({ type: 'move', index: 6 });
  });

  test('moves to the first and last item', () => {
    expect(navigatorKey('Home', 5, 13)).toStrictEqual({ type: 'move', index: 0 });
    expect(navigatorKey('End', 5, 13)).toStrictEqual({ type: 'move', index: 12 });
  });

  test('activates on Enter and Space', () => {
    expect(navigatorKey('Enter', 3, 8)).toStrictEqual({ type: 'activate' });
    expect(navigatorKey(' ', 3, 8)).toStrictEqual({ type: 'activate' });
  });

  test.each(['ArrowLeft', 'ArrowRight', '+', '-', '0', 'Escape', 'Tab', 'a'])(
    'leaves %j to bubble',
    (key) => {
      expect(navigatorKey(key, 3, 8)).toBeNull();
    },
  );

  test('returns null when there are no items', () => {
    expect(navigatorKey('ArrowDown', 0, 0)).toBeNull();
  });
});
