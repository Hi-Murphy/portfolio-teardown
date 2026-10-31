import { describe, expect, test } from 'vitest';

import { parseProject, parseTechRegistry } from '../src/index';
import { look } from '../src/look/tokens';
import {
  labelBox,
  layerNumber,
  layerText,
  partNumber,
  partShortText,
  partText,
} from '../src/overlay/parts';
import { projectAJson, projectCJson, techRegistryJson } from './fixtures';

const registry = parseTechRegistry(techRegistryJson);
const projectA = parseProject(projectAJson, { registry });
const projectC = parseProject(projectCJson, { registry });

function componentName(project: typeof projectA, layerIndex: number, slot: number): string {
  const component = project.layers[layerIndex]?.components[slot];

  if (component === undefined) throw new Error('Missing fixture component');

  return component.name;
}

describe('overlay part numbering and labels', () => {
  test('numbers fixture A by layer and slot', () => {
    expect(projectA.layers.map((_layer, layerIndex) => partNumber(layerIndex, 0))).toEqual([
      '1.1',
      '2.1',
      '3.1',
      '4.1',
    ]);
    expect(componentName(projectA, 0, 1)).toBe('Tide Chart Screen');
    expect(partText(0, 1, componentName(projectA, 0, 1))).toBe('1.2 Tide Chart Screen');
    expect(partShortText(0, 1)).toBe('1.2');
  });

  test('numbers fixture C layer 3 slot 5 as 3.5', () => {
    expect(partNumber(2, 4)).toBe('3.5');
    expect(componentName(projectC, 2, 4)).toBe('Audit Trail');
    expect(partText(2, 4, componentName(projectC, 2, 4))).toBe('3.5 Audit Trail');
    expect(partShortText(2, 4)).toBe('3.5');
  });

  test('formats 1-based layer numbers and layer text', () => {
    expect(layerNumber(0)).toBe(1);
    expect(layerNumber(3)).toBe(4);
    expect(layerText(0, 'Interface')).toBe('1 Interface');
    expect(layerText(3, 'External boundary')).toBe('4 External boundary');
    expect(layerText(2, 'Services')).toBe('3 Services');
  });

  test('sizes the known label with the R1 monospace box model', () => {
    expect(labelBox('1.2 Tide Chart Screen', look.annotation)).toStrictEqual({ w: 165, h: 21 });
  });
});
