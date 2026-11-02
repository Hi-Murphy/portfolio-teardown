import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';

import { TourPanel } from '../components/workbench/tour-panel';
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
        title: 'Alpha → Gamma',
        description: 'The primary path.',
        steps: [
          { index: 0, id: 'a', name: 'Alpha', summary: 'First component.' },
          { index: 1, id: 'b', name: 'Beta', summary: 'Second component.' },
          { index: 2, id: 'c', name: 'Gamma', summary: 'Third component.' },
        ],
      },
      {
        id: 'unlabelled',
        title: 'Gamma → missing',
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

    expect(flow?.title).toBe('Alpha → Gamma');
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

  test('a single flow renders the route header without a chooser', () => {
    const html = renderToStaticMarkup(
      createElement(TourPanel, {
        flows: [buildTourFlows(PROJECT)[0]!],
        flowId: 'main',
        status: 'idle',
        step: 0,
        onSelectFlow: () => undefined,
        onTogglePlayback: () => undefined,
        onPrevious: () => undefined,
        onNext: () => undefined,
        onRestart: () => undefined,
        onExit: () => undefined,
        onJump: () => undefined,
        onHighlight: () => undefined,
      }),
    );

    expect(html).toContain('data-site-tour-flow-header');
    expect(html).toContain('Alpha → Gamma');
    expect(html).toContain('3 steps');
    expect(html).not.toContain('role="group" aria-label="Tour flow"');
    expect(html).not.toContain('Main flow');
  });

  test('Exit tour is present only when the tour is not idle', () => {
    const props = {
      flows: buildTourFlows(PROJECT),
      flowId: 'main',
      step: 0,
      onSelectFlow: () => undefined,
      onTogglePlayback: () => undefined,
      onPrevious: () => undefined,
      onNext: () => undefined,
      onRestart: () => undefined,
      onExit: () => undefined,
      onJump: () => undefined,
      onHighlight: () => undefined,
    } as const;
    const idle = renderToStaticMarkup(createElement(TourPanel, { ...props, status: 'idle' }));
    const playing = renderToStaticMarkup(createElement(TourPanel, { ...props, status: 'playing' }));

    expect(idle).not.toContain('data-site-control="tour-exit"');
    expect(playing).toContain('data-site-control="tour-exit"');
    expect(playing).toContain('aria-label="Exit tour"');
  });

  test('transport controls render as one cluster in the requested order', () => {
    const html = renderToStaticMarkup(
      createElement(TourPanel, {
        flows: buildTourFlows(PROJECT),
        flowId: 'main',
        status: 'playing',
        step: 0,
        onSelectFlow: () => undefined,
        onTogglePlayback: () => undefined,
        onPrevious: () => undefined,
        onNext: () => undefined,
        onRestart: () => undefined,
        onExit: () => undefined,
        onJump: () => undefined,
        onHighlight: () => undefined,
      }),
    );
    const controls = ['tour-restart', 'tour-prev', 'tour-play', 'tour-next', 'tour-exit'].map(
      (control) => html.indexOf(`data-site-control="${control}"`),
    );

    expect(html).toContain('data-site-tour-transport');
    expect(controls.every((index) => index >= 0)).toBe(true);
    expect(controls).toEqual([...controls].sort((left, right) => left - right));
    expect(html).toContain('aria-label="Pause tour"');
    expect(html).toContain('aria-pressed="true"');
  });
});
