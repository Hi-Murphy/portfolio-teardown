import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test, vi } from 'vitest';

vi.mock('../components/hero/hero-boot', () => ({ bootHeroStage: vi.fn() }));

import HomePage from '../app/(site)/page';

describe('home snap style', () => {
  test('is emitted by the home page with mandatory snap, a nav offset, and a reduced-motion off switch', () => {
    vi.stubGlobal('__XP_EAGER_HERO__', true);
    vi.stubGlobal('__XP_EAGER_3D__', false);
    const markup = renderToStaticMarkup(<HomePage />);

    expect(markup).toContain('scroll-snap-type: y mandatory');
    expect(markup).toContain('scroll-margin-top: 2.8125rem');
    expect(markup).toContain('[data-home-snap-sections]');
    expect(markup).toContain('scroll-snap-align: end');
    expect(markup).toContain('scroll-snap-type: none');
    expect(markup).toContain('data-home-snap-sections=""');
    vi.unstubAllGlobals();
  });
});
