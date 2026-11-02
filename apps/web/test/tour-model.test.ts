import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';

import { ExplorePanel } from '../components/workbench/explore-panel';
import { TourPanel } from '../components/workbench/tour-panel';
import {
  buildLayerModels,
  buildTourFlows,
  findTourFlow,
  jumpSequence,
  tourStepAt,
} from '../components/workbench/tour-model';

const PROJECT = {
  layers: [
    {
      id: 'ui',
      name: 'UI',
      description: 'The visible surface.',
      components: [
        { id: 'a', name: 'Alpha', summary: 'First component.' },
        { id: 'b', name: 'Beta', summary: 'Second component.' },
      ],
    },
    {
      id: 'core',
      name: 'Core',
      description: 'The supporting parts.',
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
  test('builds layer models from the project layers', () => {
    expect(buildLayerModels(PROJECT)).toEqual([
      {
        id: 'ui',
        name: 'UI',
        partCount: 2,
        description: 'The visible surface.',
        parts: [
          { id: 'a', name: 'Alpha', summary: 'First component.' },
          { id: 'b', name: 'Beta', summary: 'Second component.' },
        ],
      },
      {
        id: 'core',
        name: 'Core',
        partCount: 1,
        description: 'The supporting parts.',
        parts: [{ id: 'c', name: 'Gamma', summary: 'Third component.' }],
      },
    ]);
  });

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

  test('the tour has no Exit control and the primary control is icon-only', () => {
    const props = {
      flows: buildTourFlows(PROJECT),
      flowId: 'main',
      step: 0,
      onSelectFlow: () => undefined,
      onTogglePlayback: () => undefined,
      onPrevious: () => undefined,
      onNext: () => undefined,
      onRestart: () => undefined,
      onJump: () => undefined,
      onHighlight: () => undefined,
    } as const;
    const playing = renderToStaticMarkup(createElement(TourPanel, { ...props, status: 'playing' }));
    const play = playing.slice(playing.indexOf('data-site-control="tour-play"'));
    const playButton = play.slice(0, play.indexOf('</button>'));

    expect(playing).not.toContain('data-site-control="tour-exit"');
    expect(playing).not.toContain('Exit tour');
    expect(playButton).toContain('aria-label="Pause tour"');
    expect(playButton).toContain('title="Pause tour"');
    expect(playButton).toContain('aria-pressed="true"');
    expect(playButton).not.toContain('<span');
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
        onJump: () => undefined,
        onHighlight: () => undefined,
      }),
    );
    const controls = ['tour-restart', 'tour-prev', 'tour-play', 'tour-next'].map((control) =>
      html.indexOf(`data-site-control="${control}"`),
    );

    expect(html).toContain('data-site-tour-transport');
    expect(controls.every((index) => index >= 0)).toBe(true);
    expect(controls).toEqual([...controls].sort((left, right) => left - right));
    expect(html).toContain('aria-label="Pause tour"');
    expect(html).toContain('aria-pressed="true"');
  });

  test('the Explore card defaults to the Layers tab and panel', () => {
    const html = renderToStaticMarkup(
      createElement(ExplorePanel, {
        layers: buildLayerModels(PROJECT),
        focusedLayerId: null,
        onToggleLayer: () => undefined,
        onEnterLayers: () => undefined,
        onEnterFlows: () => undefined,
        flows: buildTourFlows(PROJECT),
        flowId: 'main',
        status: 'idle',
        step: 0,
        onSelectFlow: () => undefined,
        onTogglePlayback: () => undefined,
        onPrevious: () => undefined,
        onNext: () => undefined,
        onRestart: () => undefined,
        onJump: () => undefined,
        onHighlight: () => undefined,
      }),
    );

    expect(html).toContain('role="tablist"');
    expect(html).toContain('aria-label="Explore mode"');
    expect(html).toContain('data-site-explore-tab="layers"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('aria-controls="explore-panel-layers"');
    expect(html).toContain('role="tabpanel"');
    expect(html).toContain('id="explore-panel-layers"');
    expect(html).toContain('id="explore-panel-flows"');
    expect(html).toContain('aria-controls="explore-panel-flows"');
    expect(html).not.toContain('data-site-explore-panel="layers" hidden');
    expect(html).toContain('data-site-explore-panel="flows" hidden=""');
    expect(html).toContain('data-site-layer-chip="ui"');
    expect(html).toContain('1 UI');
    expect(html).toContain('2 parts');
    expect(html).toContain('Pick a layer to isolate it.');
  });
});
