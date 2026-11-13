import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test, vi } from 'vitest';

vi.mock('../components/hero/hero-boot', () => ({ bootHeroStage: vi.fn() }));

import { websocketInspector } from '../content/projects/websocket-inspector';
import { HeroSection } from '../components/home/hero-section';

describe('hero figure SSR', () => {
  test('keeps the static caption, annotation slot, and borderless fixed hero stage', () => {
    // T011i: the figure carries a borderless CSS-sized stage, a drawing annotation and a
    // visually hidden static caption used as the figure's accessible name.
    vi.stubGlobal('__XP_EAGER_HERO__', true);
    vi.stubGlobal('__XP_EAGER_3D__', false);
    const markup = renderToStaticMarkup(<HeroSection />);
    const { name, tagline } = websocketInspector.meta;
    const staticCaption = tagline === undefined ? name : `${name} — ${tagline}`;

    expect(markup).toContain('<figure aria-labelledby="hero-caption"');
    expect(markup).toMatch(/<figcaption id="hero-caption" class="sr-only">/);
    expect(markup).toContain(staticCaption);
    expect(markup).toContain('data-hero-annotation=""');
    expect(markup).toContain('data-hero-loop-slot=""');
    expect(markup).toContain('block h-11 w-11');
    expect(markup).toContain('h-[15rem]');
    expect(markup).toContain('lg:h-[28rem]');
    expect(markup).toContain('_[data-xploder-caption]]:hidden');
    expect(markup).toContain('data-site-poster=""');
    expect(markup).not.toContain('data-hero-narration');
  });
});
