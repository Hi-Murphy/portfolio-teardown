import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';

import { SITE } from '../content/site';
import { heroProofEntries } from '../content/projects';
import { websocketInspector } from '../content/projects/websocket-inspector';
import { HeroProof } from '../components/hero/hero-proof';

describe('hero proof strip', () => {
  test('resolves every configured metric index against the real project content', () => {
    const entries = heroProofEntries(websocketInspector, SITE.hero.proof);

    expect(entries).toHaveLength(SITE.hero.proof.length);
    for (const [index, metricIndex] of SITE.hero.proof.entries()) {
      const metric = websocketInspector.story.metrics[metricIndex];

      expect(metric).toBeDefined();
      expect(entries[index]).toEqual({
        metric: metricIndex,
        label: metric?.label,
        value: metric?.value,
      });
    }
  });

  test('skips an invalid metric index at runtime', () => {
    expect(
      heroProofEntries(websocketInspector, [-1, websocketInspector.story.metrics.length, 0.5]),
    ).toEqual([]);
  });

  test('renders plain label and body-sized value columns on SSR', () => {
    const markup = renderToStaticMarkup(
      <HeroProof project={websocketInspector} proof={SITE.hero.proof} />,
    );
    const entries = heroProofEntries(websocketInspector, SITE.hero.proof);

    expect(markup).toContain('data-hero-proof=""');
    expect(markup).toContain('col-span-full');
    expect(markup).toContain('gap-4');
    expect(markup).toContain('border-t border-line/30');
    expect(markup).toContain('sm:grid-cols-3');
    expect(markup).toContain('sm:divide-x sm:divide-line/30');
    expect(markup.match(/<li /g)).toHaveLength(entries.length);
    expect(markup).toContain('font-mono text-xs text-muted');
    expect(markup).toContain('text-base');
    expect(markup).not.toContain('rounded border');
    expect(markup).not.toContain('data-hero-proof-layer');
    expect(markup).not.toContain('border-accent');
    for (const entry of entries) {
      expect(markup).toContain(entry.label);
      expect(markup).toContain(entry.value);
    }
  });
});
