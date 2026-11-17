import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';

import { ProjectOutline } from '../components/project-outline';
import { agentFleet } from '../content/projects/agent-fleet';

function outlineSection(markup: string): string {
  const match = markup.match(/<section\b[^>]*\bdata-site-outline(?:="")?[^>]*>/);
  expect(match).not.toBeNull();
  return match?.[0] ?? '';
}

describe('project outline focusability', () => {
  test('makes a standalone outline a Tab stop', () => {
    const markup = renderToStaticMarkup(<ProjectOutline project={agentFleet} />);

    expect(outlineSection(markup)).toContain('tabindex="0"');
  });

  test('omits the tabindex when the outline is not focusable', () => {
    const markup = renderToStaticMarkup(
      <ProjectOutline project={agentFleet} focusable={false} />,
    );

    expect(outlineSection(markup)).not.toHaveProperty('tabindex');
    expect(outlineSection(markup)).not.toContain('tabindex');
  });

  test('uses a non-focusable outline as the canvas fallback', () => {
    const source = readFileSync(
      new URL('../components/workbench/workbench-client.tsx', import.meta.url),
      'utf8',
    );
    const fallback = source.match(/fallback=\{\s*<ProjectOutline\b([\s\S]*?)>\s*\}/);

    expect(fallback).not.toBeNull();
    expect(fallback?.[1]).toContain('focusable={false}');
  });
});
