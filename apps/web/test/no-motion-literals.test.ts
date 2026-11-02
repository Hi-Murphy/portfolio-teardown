import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import {
  RULE_IDS,
  scanDir,
  scanText,
  type Hit,
  type MotionLiteralRule,
} from './motion-literal-scanner';
import { collectSourceFiles, lineOf, snippetAt } from './source-scan';

const WEB_ROOT = fileURLToPath(new URL('..', import.meta.url));
const XPLODER_SOURCE_ROOT = fileURLToPath(
  new URL('../../../packages/xploder/src/', import.meta.url),
);
const ENGINE_EXPLODE = fileURLToPath(
  new URL('../../../packages/xploder/src/engine/explode.ts', import.meta.url),
);
const SLABS = fileURLToPath(
  new URL('../../../packages/xploder/src/react/scene/Slabs.tsx', import.meta.url),
);
const PLAYGROUND = fileURLToPath(
  new URL('../app/dev/engine/engine-playground.tsx', import.meta.url),
);
const S05_SOURCE_FILES = [
  'interaction/pick.ts',
  'interaction/pointer.ts',
  'interaction/focus.ts',
  'interaction/tour.ts',
  'interaction/emphasis.ts',
  'react/scene/Emphasis.tsx',
  'react/scene/PickBridge.tsx',
  'react/overlay/TourCaption.tsx',
  'react/useTourClock.ts',
  'react/usePointerPick.ts',
].map((path) => fileURLToPath(new URL(`../../../packages/xploder/src/${path}`, import.meta.url)));
const S06_SOURCE_FILES = [
  'look/tokens.ts',
  'look/fills.ts',
  'look/product.ts',
  'overlay/project.ts',
  'overlay/parts.ts',
  'overlay/dimension.ts',
  'overlay/place.ts',
  'overlay/trace.ts',
  'overlay/timing.ts',
  'overlay/model.ts',
  'overlay/titleBlock.ts',
  'react/scene/blueprintMaterial.ts',
  'react/scene/OverlayProjector.tsx',
  'react/overlay/BlueprintOverlay.tsx',
  'react/overlay/CircuitTrace.tsx',
].map((path) => fileURLToPath(new URL(`../../../packages/xploder/src/${path}`, import.meta.url)));
const S07_SOURCE_FILES = [
  'panel/state.ts',
  'panel/place.ts',
  'panel/tourClick.ts',
  'panel/content.ts',
  'panel/look.ts',
  'panel/motion.ts',
  'react/panel/PanelLayer.tsx',
  'react/panel/DetailPanel.tsx',
  'react/panel/CaseStudyPanel.tsx',
  'react/panel/TechChips.tsx',
  'react/panel/useSlabClick.ts',
  'react/panel/useViewerPanels.ts',
  'react/panel/pickAt.ts',
  'react/panel/executeTourCommand.ts',
  'lettering/look.ts',
  'lettering/faces.ts',
  'lettering/place.ts',
  'lettering/model.ts',
  'lettering/column.ts',
  'lettering/layers.ts',
  'react/lettering/PartLettering.tsx',
].map((path) => fileURLToPath(new URL(`../../../packages/xploder/src/${path}`, import.meta.url)));
const S10_SOURCE_FILES = [
  'app/(site)/layout.tsx',
  'app/(site)/page.tsx',
  'app/(site)/projects/[slug]/page.tsx',
  'app/(site)/projects/page.tsx',
  'app/not-found.tsx',
  'components/about-strip.tsx',
  'components/hero/hero-classes.ts',
  'components/hero/hero-live.tsx',
  'components/hero/hero-stage.tsx',
  'components/project-card.tsx',
  'components/project-outline.tsx',
  'components/site-footer.tsx',
  'components/site-nav.tsx',
  'components/skip-link.tsx',
  'components/teardown-poster.tsx',
  'components/tech-chip-list.tsx',
  'components/viewer/live-viewer.tsx',
  'components/workbench/workbench-client.tsx',
  'components/workbench/workbench-loader.tsx',
  'components/workbench/workbench.tsx',
  'content/poster.ts',
  'content/projects/index.ts',
  'content/projects/websocket-inspector.source.ts',
  'content/projects/websocket-inspector.ts',
  'content/site-copy.ts',
  'content/site.source.ts',
  'content/site.ts',
  'content/tech-registry.ts',
  'scripts/convert-content.ts',
].map((path) => fileURLToPath(new URL(`../${path}`, import.meta.url)));
const S08_SOURCE_FILES = [
  'a11y/announce.ts',
  'a11y/contrast.ts',
  'a11y/look.ts',
  'a11y/navigator.ts',
  'a11y/reveal.ts',
  'react/a11y/ComponentNavigator.tsx',
  'react/a11y/CanvasBoundary.tsx',
  'react/a11y/LiveRegion.tsx',
  'react/a11y/usePanelFocus.ts',
  'react/a11y/webgl.ts',
  'react/lettering/faceNames.ts',
].map((path) => fileURLToPath(new URL(`../../../packages/xploder/src/${path}`, import.meta.url)));
const BARE_TIMING_SHORTHAND =
  /(['"`])(?=[^'"`\n]*\b\d*\.?\d+m?s\b)(?=[^'"`\n]*\b(?:ease(?:-in-out|-in|-out)?|linear|cubic-bezier\(|steps\())[^'"`\n]*\1/g;

function formatHits(hits: readonly Hit[]): string {
  return hits.map((hit) => `${hit.file}:${hit.line} ${hit.rule} ${hit.snippet}`).join('\n');
}

function expectNoHits(hits: readonly Hit[]): void {
  expect(hits, formatHits(hits)).toEqual([]);
}

function scanBareTimingShorthand(files: readonly string[]): Hit[] {
  const hits: Hit[] = [];

  for (const file of files) {
    const text = readFileSync(file, 'utf8');

    for (const match of text.matchAll(BARE_TIMING_SHORTHAND)) {
      if (match.index === undefined) continue;

      hits.push({
        file,
        line: lineOf(text, match.index),
        rule: 'css-time',
        snippet: snippetAt(text, match.index),
      });
    }
  }

  return hits;
}

const BAD_SAMPLES = {
  'css-time': 'const style = `transition: color 200ms;`;',
  'css-easing': 'const style = `transition: opacity ease-in;`;',
  'gsap-ease': "const tween = { ease: 'power2.out' };",
  'motion-key': "const style = { transitionDuration: '1s' };",
  'tw-utility': "const className = 'transition duration-200 ease-in animate-pulse';",
  timer: 'setTimeout(callback, 120);',
} satisfies Record<MotionLiteralRule, string>;

describe('motion-literal scanner', () => {
  test('apps/web contains no motion literals', () => {
    expectNoHits(scanDir(WEB_ROOT));
  });

  test('xploder source outside motion/ contains no motion literals', () => {
    expectNoHits(scanDir(XPLODER_SOURCE_ROOT, { exclude: ['motion/'] }));
  });

  test('source outside motion/ contains no bare CSS timing shorthands', () => {
    const hits = [
      ...scanBareTimingShorthand(collectSourceFiles(WEB_ROOT)),
      ...scanBareTimingShorthand(collectSourceFiles(XPLODER_SOURCE_ROOT, { exclude: ['motion/'] })),
    ];

    expectNoHits(hits);
  });

  test('scanner roots include engine sources', () => {
    const sourceFiles = collectSourceFiles(XPLODER_SOURCE_ROOT, { exclude: ['motion/'] });

    expect(sourceFiles).toContain(ENGINE_EXPLODE);
    expect(sourceFiles).toContain(SLABS);
    expect(sourceFiles).toEqual(expect.arrayContaining(S05_SOURCE_FILES));
    expect(sourceFiles).toEqual(expect.arrayContaining(S06_SOURCE_FILES));
    expect(sourceFiles).toEqual(expect.arrayContaining(S07_SOURCE_FILES));
    expect(sourceFiles).toEqual(expect.arrayContaining(S08_SOURCE_FILES));
    expect(collectSourceFiles(WEB_ROOT).length).toBeGreaterThan(0);
    expect(collectSourceFiles(WEB_ROOT)).toEqual(expect.arrayContaining(S10_SOURCE_FILES));
  });

  test.skipIf(!existsSync(PLAYGROUND))('scanner root includes the engine playground', () => {
    expect(collectSourceFiles(WEB_ROOT)).toContain(PLAYGROUND);
  });

  for (const rule of RULE_IDS) {
    test(`${rule} catches its negative control`, () => {
      const hits = scanText(BAD_SAMPLES[rule], `fixture-${rule}.ts`);

      expect(
        hits.map((hit) => hit.rule),
        formatHits(hits),
      ).toContain(rule);
    });
  }

  test.each([
    'motion.durations.explode',
    'transition-duration: var(--motion-duration-hover-lift)',
    'className="ease-explode transition-colors"',
    '<p>the 1990s</p>',
    "{ label: 'p95', value: '120 ms' }",
  ])('accepts content, tokens and token-backed utilities: %s', (sample) => {
    expectNoHits(scanText(sample, 'good-sample.ts'));
  });
});
