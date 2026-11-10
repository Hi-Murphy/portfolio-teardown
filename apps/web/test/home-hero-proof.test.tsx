// @vitest-environment jsdom

import { act, useLayoutEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, test } from 'vitest';

import { SITE } from '../content/site';
import { heroProofEntries, type HeroProofReference } from '../content/projects';
import { websocketInspector } from '../content/projects/websocket-inspector';
import { HeroProof } from '../components/hero/hero-proof';
import {
  HeroShowcaseProvider,
  showcaseForSequence,
  useHeroShowcase,
  type HeroShowcaseState,
} from '../components/hero/hero-showcase';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function proofState(overrides: Partial<HeroShowcaseState> = {}): HeroShowcaseState {
  return {
    phase: 'idle',
    flowLabel: null,
    step: -1,
    total: 0,
    componentName: null,
    componentSummary: null,
    layerId: null,
    paused: true,
    available: false,
    ...overrides,
  };
}

function Publisher({ state }: { readonly state: HeroShowcaseState }) {
  const { publish } = useHeroShowcase();

  useLayoutEffect(() => publish(state), [publish, state]);
  return null;
}

let root: Root | null = null;
let container: HTMLDivElement | null = null;

async function renderProof(state: HeroShowcaseState): Promise<void> {
  await act(async () => {
    root?.render(
      <HeroShowcaseProvider>
        <Publisher state={state} />
        <HeroProof project={websocketInspector} proof={SITE.hero.proof} />
      </HeroShowcaseProvider>,
    );
  });
}

function item(layer: string): HTMLElement | null {
  return container?.querySelector<HTMLElement>(`[data-hero-proof-layer="${layer}"]`) ?? null;
}

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  container?.remove();
  container = null;
});

describe('hero proof strip', () => {
  test('resolves every configured metric and layer against the real project content', () => {
    const entries = heroProofEntries(websocketInspector, SITE.hero.proof);
    const layerIds = new Set(websocketInspector.layers.map((layer) => layer.id));

    expect(entries).toHaveLength(SITE.hero.proof.length);
    for (const [index, reference] of SITE.hero.proof.entries()) {
      const metric = websocketInspector.story.metrics[reference.metric];

      expect(metric).toBeDefined();
      expect(reference.layer === null || layerIds.has(reference.layer)).toBe(true);
      expect(entries[index]).toEqual({
        metric: reference.metric,
        label: metric?.label,
        value: metric?.value,
        layerId: reference.layer,
      });
    }
  });

  test('skips an invalid metric index or layer id at runtime', () => {
    const invalid: readonly HeroProofReference[] = [
      { metric: -1, layer: 'capture' },
      { metric: websocketInspector.story.metrics.length, layer: null },
      { metric: 0, layer: 'missing-layer' },
    ];

    expect(heroProofEntries(websocketInspector, invalid)).toEqual([]);
  });

  test('derives the current layer from the public tour data', () => {
    const flow = websocketInspector.flows?.find((candidate) => candidate.id === 'capture-path');
    const step = flow?.path.findIndex((componentId) =>
      websocketInspector.layers
        .find((layer) => layer.id === 'persistence')
        ?.components.some((component) => component.id === componentId),
    );
    if (flow === undefined || step === undefined || step < 0) {
      throw new Error('capture-path did not reach persistence');
    }

    const showcase = showcaseForSequence(websocketInspector, {
      phase: 'capture',
      status: 'running',
      started: true,
      tour: { status: 'playing', flowId: flow.id, step, total: flow.path.length },
    });

    expect(showcase.layerId).toBe('persistence');
  });

  test('renders labels and body-sized values on SSR with nothing highlighted', () => {
    const markup = renderToStaticMarkup(
      <HeroProof project={websocketInspector} proof={SITE.hero.proof} />,
    );
    const entries = heroProofEntries(websocketInspector, SITE.hero.proof);

    expect(markup).toContain('data-hero-proof=""');
    expect(markup).toContain('col-span-full');
    expect(markup).toContain('sm:grid-cols-3');
    expect(markup.match(/<li /g)).toHaveLength(entries.length);
    expect(markup).toContain('font-mono text-xs text-muted');
    expect(markup).toContain('text-base');
    expect(markup).not.toContain('border-accent');
    for (const entry of entries) {
      expect(markup).toContain(entry.label);
      expect(markup).toContain(entry.value);
    }
  });

  test('highlights only the item for the current tour layer', async () => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);

    await renderProof(proofState({ phase: 'capture', layerId: 'capture', available: true }));

    const active = item('capture');
    const idle = item('persistence');
    expect(active?.className).toContain('border-accent');
    expect(active?.querySelector('[data-hero-proof-value]')?.className).toContain('text-fg');
    expect(idle?.className).toContain('border-line/30');
    expect(idle?.querySelector('[data-hero-proof-value]')?.className).toContain('text-muted');
    expect(container.querySelector('[aria-current]')).toBeNull();

    await renderProof(proofState({ phase: 'turn', layerId: 'capture', available: true }));

    expect(container.querySelector('.border-accent')).toBeNull();
  });
});
