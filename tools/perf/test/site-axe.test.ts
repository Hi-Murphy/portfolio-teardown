import { readFile } from 'node:fs/promises';

import { describe, expect, test } from 'vitest';

import type { AxeScanResults } from '../src/a11y-axe.ts';
import { EXIT } from '../src/exit-codes.ts';
import { PROJECT_SOURCES, projectPath } from '../src/project-sources.ts';
import {
  SITE_STATE_IDS,
  SITE_STATES,
  summarizeAxeResults,
  type SiteAxeStateResult,
} from '../src/site-axe.ts';

async function seriousFixture(): Promise<AxeScanResults> {
  return JSON.parse(
    await readFile(new URL('./fixtures/axe-serious.json', import.meta.url), 'utf8'),
  ) as AxeScanResults;
}

function stateResult(
  state: SiteAxeStateResult['state'],
  results: AxeScanResults,
): SiteAxeStateResult {
  return {
    state,
    routeGroup: state === 'projects' ? 'projects' : 'home',
    path: state === 'projects' ? '/projects' : '/',
    url: `http://127.0.0.1:4310${state === 'projects' ? '/projects' : '/'}`,
    violations: results.violations,
    incomplete: results.incomplete,
  };
}

describe('site axe summary', () => {
  test('aggregates recorded state counts and failing rules', async () => {
    const serious = await seriousFixture();
    const results = summarizeAxeResults([
      stateResult('home', { violations: [], incomplete: [] }),
      stateResult('home-poster', { violations: [], incomplete: serious.incomplete }),
      stateResult('home-reduced', serious),
      stateResult('projects', serious),
    ]);

    expect(results).toMatchObject({
      serious: 2,
      critical: 0,
      moderate: 0,
      minor: 0,
      incomplete: 0,
    });
    expect(results.failingRules).toEqual(['button-name']);
    expect(results.exitCode).toBe(EXIT.BUDGET);
  });

  test('a recorded serious violation exits 6', async () => {
    const aggregate = summarizeAxeResults([stateResult('projects', await seriousFixture())]);

    expect(aggregate.serious).toBe(1);
    expect(aggregate.exitCode).toBe(EXIT.BUDGET);
  });

  test('state list snapshot', () => {
    expect(SITE_STATE_IDS).toEqual([
      'home',
      'home-poster',
      'home-reduced',
      'projects',
      'project-poster',
      'project-idle',
      'project-case-study',
      'project-detail',
      'project-flows-step1',
      'project-no-webgl',
    ]);
  });

  test('project states cover every project path and shared states appear once', () => {
    const projectStateIds = SITE_STATE_IDS.filter((id) => id.startsWith('project-'));
    const expectedProjectStates = PROJECT_SOURCES.flatMap((source) =>
      projectStateIds.map((id) => ({ id, path: projectPath(source) })),
    );
    const actualProjectStates = SITE_STATES.filter((state) => state.routeGroup === 'project').map(
      ({ id, path }) => ({ id, path }),
    );

    expect(actualProjectStates).toEqual(expectedProjectStates);

    const sharedStates = SITE_STATES.filter((state) => state.routeGroup !== 'project');
    expect(sharedStates.map((state) => state.id)).toEqual([
      'home',
      'home-poster',
      'home-reduced',
      'projects',
    ]);
    expect(new Set(SITE_STATES.map((state) => `${state.id}@${state.path}`)).size).toBe(
      SITE_STATES.length,
    );
  });
});
