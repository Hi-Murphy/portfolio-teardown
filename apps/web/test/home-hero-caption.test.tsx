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
  test('swaps the static caption for an aria-hidden narration in the same two-line slot', async () => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    const state = narrationState();
    const expected = `${state.flowLabel} · ${state.step + 1}/${state.total} · ${state.componentName} — ${state.componentSummary}`;

    await renderCaption(state);

    const caption = container.querySelector<HTMLElement>('#hero-caption');
    const staticText = caption?.querySelector('span:not([data-hero-narration])');
    const dynamic = caption?.querySelector<HTMLElement>('[data-hero-narration]');
    const slot = caption?.querySelector<HTMLElement>('[data-hero-loop-slot]');
    const button = slot?.querySelector('button');

    expect(caption?.className).toContain('min-h-[3.25rem]');
    expect(caption?.textContent).toContain(websocketInspector.meta.name);
    expect(staticText?.className).toContain('sr-only');
    expect(staticText?.className).toContain('line-clamp-2');
    expect(dynamic?.textContent).toBe(expected);
    expect(dynamic?.getAttribute('aria-hidden')).toBe('true');
    expect(dynamic?.className).toContain('line-clamp-2');
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
    const staticText = caption?.querySelector('span');

    expect(caption?.querySelector('[data-hero-narration]')).toBeNull();
    expect(staticText?.className).not.toContain('sr-only');
    expect(caption?.querySelector('[data-hero-loop-slot] button')).toBeNull();
    expect(caption?.querySelector('[data-hero-loop-slot] [aria-hidden="true"]')).not.toBeNull();
  });
});
