import { describe, expect, test } from 'vitest';

import { layoutProject, type ProjectLayout } from '../src/layout';
import type { FaceQuad } from '../src/lettering/faces';
import { letteringModel, type ComponentLettering } from '../src/lettering/model';
import { FACE_NAMES_MIN_ZOOM, faceLetteringAllOrNone } from '../src/react/lettering/faceNames';

const ROOMY_FACE: FaceQuad = [
  [0, 0],
  [220, 0],
  [220, 100],
  [0, 100],
];
const NUMBER_ONLY_FACE: FaceQuad = [
  [0, 0],
  [40, 0],
  [40, 24],
  [0, 24],
];
const LAYOUT = layoutProject({
  layers: [
    {
      id: 'layer-1',
      components: [{ id: 'first' }, { id: 'second' }],
    },
  ],
});
const NAMES: ReadonlyMap<string, string> = new Map([
  ['first', 'First'],
  ['second', 'Second'],
]);

function buildLettering(
  layout: ProjectLayout,
  quads: readonly FaceQuad[],
  names: ReadonlyMap<string, string>,
): readonly ComponentLettering[] {
  return letteringModel({
    layout,
    components: layout.components.map((component, index) => ({
      id: component.id,
      layerIndex: component.layerIndex,
      slot: component.slot,
      quad: quads[index] ?? NUMBER_ONLY_FACE,
      hull: [],
    })),
    layers: [],
    names,
  });
}

function faceNameCount(items: readonly ComponentLettering[]): number {
  return items.filter((item) => item.lettering.kind === 'face' && item.lettering.namePx !== null)
    .length;
}

describe('face lettering names', () => {
  test.each([1, 1.25])(
    'hides every face name below the second zoom-in click at zoom %s',
    (zoomFactor) => {
      const items = faceLetteringAllOrNone({
        zoomFactor,
        columnActive: false,
        names: NAMES,
        build: (names) => buildLettering(LAYOUT, [ROOMY_FACE, ROOMY_FACE], names),
      });

      expect(items.every((item) => item.lettering.kind === 'face')).toBe(true);
      expect(faceNameCount(items)).toBe(0);
    },
  );

  test.each([FACE_NAMES_MIN_ZOOM, 2.44140625, 3])(
    'shows every face name at zoom %s when every name fits',
    (zoomFactor) => {
      const items = faceLetteringAllOrNone({
        zoomFactor,
        columnActive: false,
        names: NAMES,
        build: (names) => buildLettering(LAYOUT, [ROOMY_FACE, ROOMY_FACE], names),
      });

      expect(faceNameCount(items)).toBe(items.length);
    },
  );

  test('hides every face name when one face can only fit its number', () => {
    const items = faceLetteringAllOrNone({
      zoomFactor: FACE_NAMES_MIN_ZOOM,
      columnActive: false,
      names: NAMES,
      build: (names) => buildLettering(LAYOUT, [ROOMY_FACE, NUMBER_ONLY_FACE], names),
    });

    expect(items.map((item) => item.lettering.kind)).toEqual(['face', 'face']);
    expect(faceNameCount(items)).toBe(0);
  });

  test.each([1, FACE_NAMES_MIN_ZOOM, 3])(
    'keeps face names out of the compact column at zoom %s',
    (zoomFactor) => {
      const items = faceLetteringAllOrNone({
        zoomFactor,
        columnActive: true,
        names: NAMES,
        build: (names) => buildLettering(LAYOUT, [ROOMY_FACE, ROOMY_FACE], names),
      });

      expect(items.every((item) => item.lettering.kind === 'face')).toBe(true);
      expect(faceNameCount(items)).toBe(0);
    },
  );

  test('ignores mark lettering when deciding whether every face has a name', () => {
    const face = buildLettering(LAYOUT, [ROOMY_FACE], NAMES)[0];

    if (face === undefined || face.lettering.kind !== 'face') {
      throw new Error('Expected roomy face lettering');
    }

    const mark: ComponentLettering = {
      id: 'mark',
      layerIndex: 0,
      number: '2.1',
      lettering: {
        kind: 'mark',
        x: 0,
        y: 0,
        numberPx: 9,
        matrix: [1, 0, 0, 1, 0, 0],
        box: { w: 1, h: 1 },
        anchor: [0, 0],
      },
    };
    const items = faceLetteringAllOrNone({
      zoomFactor: 2,
      columnActive: false,
      names: NAMES,
      build: () => [face, mark],
    });

    expect(items).toEqual([face, mark]);
    expect(faceNameCount(items)).toBe(1);
  });
});
