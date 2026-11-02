import { describe, expect, test } from 'vitest';

import {
  buildTourFlows,
  findTourFlow,
  jumpSequence,
  tourStepAt,
} from '../components/workbench/tour-model';

const PROJECT = {
  layers: [
    {
      components: [
        { id: 'a', name: 'Alpha', summary: 'First component.' },
        { id: 'b', name: 'Beta', summary: 'Second component.' },
      ],
    },
    {
      components: [{ id: 'c', name: 'Gamma', summary: 'Third component.' }],
    },
  ],
  flows: [
    {
      id: 'main',
      label: 'Main flow',
      description: 'The primary path.',
      path: ['a', 'b', 'c'],
    },
    {
      id: 'unlabelled',
      path: ['c', 'missing'],
    },
  ],
} as const;

describe('tour model', () => {
  test('builds steps from flows and resolves component names and summaries', () => {
    const flows = buildTourFlows(PROJECT);

    expect(flows).toEqual([
      {
        id: 'main',
        label: 'Main flow',
        description: 'The primary path.',
        steps: [
          { index: 0, id: 'a', name: 'Alpha', summary: 'First component.' },
          { index: 1, id: 'b', name: 'Beta', summary: 'Second component.' },
          { index: 2, id: 'c', name: 'Gamma', summary: 'Third component.' },
        ],
      },
      {
        id: 'unlabelled',
        label: 'unlabelled',
        description: '',
        steps: [
          { index: 0, id: 'c', name: 'Gamma', summary: 'Third component.' },
          { index: 1, id: 'missing', name: 'missing', summary: '' },
        ],
      },
    ]);
  });

  test('finds the current flow and step', () => {
    const flows = buildTourFlows(PROJECT);
    const flow = findTourFlow(flows, 'main');

    expect(flow?.label).toBe('Main flow');
    expect(findTourFlow(flows, null)).toBeUndefined();
    expect(tourStepAt(flow, 1)).toEqual({
      index: 1,
      id: 'b',
      name: 'Beta',
      summary: 'Second component.',
    });
    expect(tourStepAt(flow, 99)).toBeUndefined();
  });

  test('jump sequence stops, steps k+1 times, then resumes only when requested', () => {
    expect(jumpSequence(0, false)).toEqual(['stop', 'step']);
    expect(jumpSequence(2, false)).toEqual(['stop', 'step', 'step', 'step']);
    expect(jumpSequence(2, true)).toEqual(['stop', 'step', 'step', 'step', 'play']);
  });
});
