import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test, vi } from 'vitest';

vi.mock('../components/hero/hero-boot', () => ({ bootHeroStage: vi.fn() }));

import { HeroSection } from '../components/home/hero-section';

function classNames(opening: RegExpExecArray): readonly string[] {
  const value = /\bclass="([^"]*)"/.exec(opening[0])?.[1];

  if (value === undefined) throw new Error('poster is missing its class attribute');

  return value.split(/\s+/);
}

describe('home poster no-JS fallback', () => {
  test('shows the numbered poster when scripting is unavailable', () => {
    vi.stubGlobal('__XP_EAGER_HERO__', true);
    vi.stubGlobal('__XP_EAGER_3D__', false);
    const markup = renderToStaticMarkup(<HeroSection />);
    vi.unstubAllGlobals();

    const posters = [...markup.matchAll(/<svg\b[^>]*\bdata-site-poster=""[^>]*>/g)];
    const flowOffset = markup.indexOf('data-site-poster-flow=""');

    expect(posters).toHaveLength(2);
    expect(flowOffset).toBeGreaterThanOrEqual(0);

    const exploded = posters.find(
      (poster, index) =>
        poster.index < flowOffset && flowOffset < (posters[index + 1]?.index ?? markup.length),
    );
    const imploded = posters.find((poster) => poster !== exploded);

    if (exploded === undefined || imploded === undefined) {
      throw new Error('expected imploded and exploded posters');
    }

    expect(classNames(exploded)).toContain('noscript:block');
    expect(classNames(imploded)).toContain('noscript:hidden');
  });
});
