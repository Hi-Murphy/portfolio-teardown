// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, test } from 'vitest';

import {
  HERO_ANNOTATION_SELECTOR,
  HERO_STAGE_SELECTOR,
  HERO_TRACE_PAD_ATTRIBUTE,
  HERO_TRACE_PAD_SELECTOR,
  findHeroStage,
  findHeroTracePad,
  readHeroLeaderGeometry,
} from '../components/hero/hero-dom';

const ENGINE_VIEWER = resolve(process.cwd(), '../../packages/xploder/src/react/TeardownViewer.tsx');
const ENGINE_TRACE = resolve(
  process.cwd(),
  '../../packages/xploder/src/react/overlay/CircuitTrace.tsx',
);

describe('hero engine DOM contract', () => {
  test('pins the stage and trace-pad selectors used by the camera bridge', () => {
    expect(HERO_STAGE_SELECTOR).toBe('[data-xploder-stage]');
    expect(HERO_TRACE_PAD_SELECTOR).toBe('[data-xploder-trace-pad]');
    expect(HERO_TRACE_PAD_ATTRIBUTE).toBe('data-xploder-trace-pad');

    expect(readFileSync(ENGINE_VIEWER, 'utf8')).toContain('data-xploder-stage=""');
    expect(readFileSync(ENGINE_TRACE, 'utf8')).toContain(
      'data-xploder-trace-pad={model.vertices[index] ?? index}',
    );
  });

  test('finds the stage and the active trace pad, and measures the leader from annotation to pad', () => {
    const root = document.createElement('figure');
    root.innerHTML = `
      <div data-xploder-stage=""></div>
      <svg>
        <circle data-xploder-trace-pad="main-activity" cx="20" cy="30" r="4"></circle>
      </svg>
      <div data-hero-annotation=""></div>
    `;
    const stage = root.querySelector('[data-xploder-stage]');
    const annotation = root.querySelector<HTMLElement>(HERO_ANNOTATION_SELECTOR);
    const pad = root.querySelector<SVGCircleElement>(HERO_TRACE_PAD_SELECTOR);

    expect(findHeroStage(root)).toBe(stage);
    expect(findHeroTracePad(root, 'main-activity')).toBe(pad);
    expect(findHeroTracePad(root, 'missing')).toBeNull();

    Object.defineProperty(root, 'getBoundingClientRect', {
      value: () => ({ left: 10, top: 20, width: 300, height: 400 }),
    });
    Object.defineProperty(annotation, 'getBoundingClientRect', {
      value: () => ({ left: 20, top: 120, width: 100, height: 80 }),
    });
    Object.defineProperty(pad, 'getBoundingClientRect', {
      value: () => ({ left: 210, top: 220, width: 20, height: 20 }),
    });

    expect(readHeroLeaderGeometry(root, 'main-activity')).toEqual({
      x1: 10,
      y1: 100,
      x2: 210,
      y2: 210,
    });
  });
});
