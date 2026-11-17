import { renderToStaticMarkup } from 'react-dom/server';
import type { Project } from 'xploder';
import { describe, expect, test } from 'vitest';

import { TechChipList } from '../components/tech-chip-list';
import { ProjectCard } from '../components/project-card';
import { cardModel } from '../content/projects';
import { agentFleet } from '../content/projects/agent-fleet';
import { jevToolkit } from '../content/projects/jev-toolkit';
import { websocketInspector } from '../content/projects/websocket-inspector';

// agent-fleet without its techs and links (S19 gave the real project four chips).
const techlessProject: Project = {
  ...agentFleet,
  layers: agentFleet.layers.map((layer) => ({
    ...layer,
    components: layer.components.map((component) => ({ ...component, techs: [], links: [] })),
  })),
};

function count(markup: string, pattern: RegExp): number {
  return [...markup.matchAll(pattern)].length;
}

describe('empty tech chip rendering', () => {
  test('renders no tech list on the compact card for a project without techs', () => {
    const markup = renderToStaticMarkup(
      <ProjectCard model={cardModel(techlessProject)} variant="compact" />,
    );

    expect(markup).not.toContain('aria-label="Tech"');
    expect(markup).not.toContain('<ul');
  });

  test('renders no tech list or Source link on the list card for a project without techs', () => {
    const markup = renderToStaticMarkup(
      <ProjectCard model={cardModel(techlessProject)} project={techlessProject} variant="list" />,
    );

    expect(markup).not.toContain('aria-label="Tech"');
    expect(markup).not.toContain('<ul');
    expect(markup).not.toContain('>Source<');
  });

  test('renders the empty string for an empty chip list', () => {
    expect(renderToStaticMarkup(<TechChipList chips={[]} />)).toBe('');
  });

  test('keeps the four tech chips on the websocket-inspector compact card', () => {
    const markup = renderToStaticMarkup(
      <ProjectCard model={cardModel(websocketInspector)} variant="compact" />,
    );

    expect(count(markup, /aria-label="Tech"/g)).toBe(1);
    expect(count(markup, /<li\b/g)).toBe(4);
  });

  test('shows the four agent-fleet chips on the compact card (S19)', () => {
    const markup = renderToStaticMarkup(
      <ProjectCard model={cardModel(agentFleet)} variant="compact" />,
    );

    expect(count(markup, /aria-label="Tech"/g)).toBe(1);
    expect([...markup.matchAll(/<li\b[^>]*>.*?<span>([^<]+)<\/span>/g)].map((m) => m[1])).toEqual([
      'Infrastructure',
      'Agents',
      'Linux',
      'Git',
    ]);
  });

  test('keeps the tech chip and Source link on the jev-toolkit list card', () => {
    const markup = renderToStaticMarkup(
      <ProjectCard model={cardModel(jevToolkit)} project={jevToolkit} variant="list" />,
    );

    expect(count(markup, /aria-label="Tech"/g)).toBe(1);
    expect(markup).toContain('>Source<');
  });
});
