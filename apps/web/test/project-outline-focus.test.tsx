// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';

import { dropTabStopInsideCanvas, ProjectOutline } from '../components/project-outline';
import { agentFleet } from '../content/projects/agent-fleet';

function outlineSection(markup: string): string {
  const match = markup.match(/<section\b[^>]*\bdata-site-outline(?:="")?[^>]*>/);
  expect(match).not.toBeNull();
  return match?.[0] ?? '';
}

describe('project outline focusability', () => {
  test('keeps a standalone outline as a Tab stop', () => {
    const markup = renderToStaticMarkup(<ProjectOutline project={agentFleet} />);

    expect(outlineSection(markup)).toContain('tabindex="0"');
  });

  test('drops the Tab stop for an outline inside a canvas', () => {
    document.body.innerHTML =
      '<canvas><section tabindex="0" data-site-outline=""></section></canvas>';
    const section = document.querySelector<HTMLElement>('section');
    expect(section).not.toBeNull();

    dropTabStopInsideCanvas(section);

    expect(section?.tabIndex).toBe(-1);
  });

  test('keeps the Tab stop for an outline outside a canvas', () => {
    document.body.innerHTML = '<div><section tabindex="0" data-site-outline=""></section></div>';
    const section = document.querySelector<HTMLElement>('section');
    expect(section).not.toBeNull();

    dropTabStopInsideCanvas(section);

    expect(section?.tabIndex).toBe(0);
  });

  test('does nothing for a missing node', () => {
    expect(() => dropTabStopInsideCanvas(null)).not.toThrow();
  });

  test('uses the context-aware outline in the canvas fallback', () => {
    const source = readFileSync(
      new URL('../components/workbench/workbench-client.tsx', import.meta.url),
      'utf8',
    );
    const fallback = source.match(/fallback=\{\s*<ProjectOutline\b([\s\S]*?)>\s*\}/);

    expect(fallback).not.toBeNull();
    expect(fallback?.[1]).toContain('ref={dropTabStopInsideCanvas}');
  });
});
