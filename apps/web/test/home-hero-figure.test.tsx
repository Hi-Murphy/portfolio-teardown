import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test, vi } from 'vitest';

vi.mock('../components/hero/hero-boot', () => ({ bootHeroStage: vi.fn() }));

import { websocketInspector } from '../content/projects/websocket-inspector';
import { HeroSection } from '../components/home/hero-section';

describe('hero figure SSR', () => {
  test('keeps the static caption, reserved slot, and hero-only tour caption rule', () => {
    // T011d: the figure now carries the client caption row, narration slot and hero-only
    // engine-caption hiding rule; SSR still renders the static project caption.
    vi.stubGlobal('__XP_EAGER_HERO__', true);
    vi.stubGlobal('__XP_EAGER_3D__', false);
    const markup = renderToStaticMarkup(<HeroSection />);
    const { name, tagline } = websocketInspector.meta;
    const staticCaption = tagline === undefined ? name : `${name} — ${tagline}`;

    expect(markup).toContain('<figure aria-labelledby="hero-caption"');
    expect(markup).toMatch(/<figcaption id="hero-caption"[^>]*>/);
    expect(markup).toContain(staticCaption);
    expect(markup).toContain('data-hero-loop-slot=""');
    expect(markup).toContain('block h-11 w-11');
    expect(markup).toContain('line-clamp-2');
    expect(markup).toContain('min-h-[3.25rem]');
    expect(markup).toContain('_[data-xploder-caption]]:hidden');
    expect(markup).toContain('data-site-poster=""');
    expect(markup).not.toContain('data-hero-narration');
  });
});
