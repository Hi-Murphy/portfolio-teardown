// @vitest-environment jsdom

import { act, useLayoutEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { websocketInspector } from '../content/projects/websocket-inspector';
import { HeroCaption } from '../components/hero/hero-caption';
import {
  HeroShowcaseProvider,
  useHeroShowcase,
  type HeroShowcaseState,
} from '../components/hero/hero-showcase';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const LABELS = { pause: 'Pause animation test', play: 'Play animation test' };

function Publisher({ state }: { readonly state: HeroShowcaseState }) {
  const { publish } = useHeroShowcase();

  useLayoutEffect(() => publish(state), [publish, state]);
  return null;
}

function narrationState(): HeroShowcaseState {
  const flow = websocketInspector.flows?.[0];
  const componentId = flow?.path[0];
  const component = websocketInspector.layers
    .flatMap((layer) => layer.components)
    .find((candidate) => candidate.id === componentId);

  return {
    phase: 'capture',
    flowLabel: flow?.label ?? null,
    step: 0,
    total: flow?.path.length ?? 0,
    componentName: component?.name ?? null,
    componentSummary: component?.summary ?? null,
    paused: false,
    available: true,
  };
}

let root: Root | null = null;
let container: HTMLDivElement | null = null;

async function renderCaption(state: HeroShowcaseState): Promise<void> {
  await act(async () => {
    root?.render(
      <figure aria-labelledby="hero-caption">
        <HeroShowcaseProvider>
          <Publisher state={state} />
          <HeroCaption
            name={websocketInspector.meta.name}
            tagline={websocketInspector.meta.tagline}
            labels={LABELS}
          />
        </HeroShowcaseProvider>
      </figure>,
    );
  });
}

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  container?.remove();
  container = null;
  vi.restoreAllMocks();
});

describe('hero caption row', () => {
  test('renders the tour drawing annotation with an accessible static caption and pause control', async () => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    const state = narrationState();

    await renderCaption(state);

    const caption = container.querySelector<HTMLElement>('#hero-caption');
    const annotation = container.querySelector<HTMLElement>('[data-hero-annotation]');
    const dynamic = annotation?.querySelector<HTMLElement>('[data-hero-narration]');
    const slot = annotation?.querySelector<HTMLElement>('[data-hero-loop-slot]');
    const button = slot?.querySelector('button');

    expect(caption?.className).toBe('sr-only');
    expect(caption?.textContent).toContain(websocketInspector.meta.name);
    expect(caption?.textContent).toContain(websocketInspector.meta.tagline ?? '');
    expect(annotation?.className).toContain('h-[6.5rem]');
    expect(dynamic?.textContent).toContain(state.flowLabel ?? '');
    expect(dynamic?.textContent).toContain(`${state.step + 1}/${state.total}`);
    expect(dynamic?.textContent).toContain(state.componentName ?? '');
    expect(dynamic?.textContent).toContain(state.componentSummary ?? '');
    expect(dynamic?.getAttribute('aria-hidden')).toBe('true');
    expect(slot?.className).toContain('h-11');
    expect(slot?.className).toContain('w-11');
    expect(button?.getAttribute('aria-label')).toBe(LABELS.pause);
    expect(button?.closest('[aria-hidden="true"]')).toBeNull();
  });

  test('shows the static caption during a turn and keeps the spacer in the slot', async () => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);

    await renderCaption({
      ...narrationState(),
      phase: 'turn',
      paused: true,
      available: false,
    });

    const caption = container.querySelector<HTMLElement>('#hero-caption');
    const annotation = container.querySelector<HTMLElement>('[data-hero-annotation]');

    expect(caption?.className).toBe('sr-only');
    expect(annotation?.querySelector('[data-hero-narration]')).toBeNull();
    expect(annotation?.textContent).toContain(websocketInspector.meta.name);
    expect(annotation?.textContent).toContain(websocketInspector.meta.tagline ?? '');
    expect(annotation?.querySelector('[data-hero-loop-slot] button')).toBeNull();
    expect(annotation?.querySelector('[data-hero-loop-slot] [aria-hidden="true"]')).not.toBeNull();
  });
});
