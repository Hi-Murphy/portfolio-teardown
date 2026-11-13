import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test, vi } from 'vitest';

vi.mock('../components/hero/hero-boot', () => ({ bootHeroStage: vi.fn() }));

import { websocketInspector } from '../content/projects/websocket-inspector';
import { HeroSection } from '../components/home/hero-section';

describe('hero figure SSR', () => {
  test('keeps the static caption, annotation slot, and larger borderless hero stage', () => {
    // T011j: the model takes the larger grid share, while the annotation and accessible static
    // caption keep their measured slots.
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
    expect(markup).toContain('lg:grid-cols-[minmax(0,0.6fr)_minmax(0,1.4fr)]');
    expect(markup).toContain('h-[16rem]');
    expect(markup).toContain('lg:h-[min(78svh,47.5rem)]');
    expect(markup).toContain('[&amp;_[data-site-live]]:pointer-events-none');
    expect(markup).toContain('[&amp;_[data-xploder-stage]]:overflow-hidden!');
    expect(markup).toContain('_[data-xploder-caption]]:hidden');
    expect(markup).toContain('data-site-poster=""');
    expect(markup).not.toContain('data-hero-narration');
  });
});
