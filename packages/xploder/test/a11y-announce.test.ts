import { describe, expect, test } from 'vitest';

import { parseProject } from '../src/index';
import { ANNOUNCE, announce, type AnnounceEvent, type AnnounceProject } from '../src/a11y/announce';
import type { TourPosition } from '../src/interaction/tour';
import { projectAJson } from './fixtures';

const project = parseProject(projectAJson);
const liveUpdate = project.flows.find((flow) => flow.id === 'live-update');

if (liveUpdate === undefined) throw new Error('Fixture A is missing the live-update flow');
const liveUpdatePath = liveUpdate.path;
const noSummaryProject: AnnounceProject = {
  meta: { slug: 'bare-project' },
  layers: [{ components: [{ id: 'bare', name: 'Bare', kind: 'service' }] }],
};

function tourPosition(step: number): TourPosition {
  return {
    status: 'paused',
    step,
    total: liveUpdatePath.length,
    componentId: liveUpdatePath[step] ?? null,
    stepStartedAt: null,
    nextBoundary: null,
  };
}

interface AnnouncementCase {
  readonly event: string;
  readonly input: AnnounceEvent;
  readonly expected: string;
}

const CASES: readonly AnnouncementCase[] = [
  {
    event: 'tourStep step 1',
    input: { type: 'tourStep', flowId: 'live-update', position: tourPosition(0) },
    expected:
      'Live update · Step 1 of 6. Beachgoer. A person checking the next high tide.. A new tide reading travels from the public feed to the chart.',
  },
  {
    event: 'tourStep step 2',
    input: { type: 'tourStep', flowId: 'live-update', position: tourPosition(1) },
    expected:
      'Live update · Step 2 of 6. Tide Chart Screen. The main chart and its live-or-saved state.',
  },
  {
    event: 'tourStep step 3',
    input: { type: 'tourStep', flowId: 'live-update', position: tourPosition(2) },
    expected:
      'Live update · Step 3 of 6. Tide View Model. Combines the selected beach with the latest tide series.',
  },
  {
    event: 'tourStep step 4',
    input: { type: 'tourStep', flowId: 'live-update', position: tourPosition(3) },
    expected:
      'Live update · Step 4 of 6. Tide Repository. Chooses between a live reading and the saved forecast.',
  },
  {
    event: 'tourStep step 5',
    input: { type: 'tourStep', flowId: 'live-update', position: tourPosition(4) },
    expected:
      'Live update · Step 5 of 6. Live Tide Client. Keeps the current tide reading in step.',
  },
  {
    event: 'tourStep step 6',
    input: { type: 'tourStep', flowId: 'live-update', position: tourPosition(5) },
    expected: 'Live update · Step 6 of 6. Tide Feed. A public feed of coastal tide readings.',
  },
  {
    event: 'tourJump',
    input: { type: 'tourJump', flowId: 'live-update', position: tourPosition(3) },
    expected:
      'Jumped to Live update · Step 4 of 6. Tide Repository. Chooses between a live reading and the saved forecast.',
  },
  {
    event: 'tourPausedOpen',
    input: { type: 'tourPausedOpen', componentId: 'tide-repository' },
    expected:
      'Tour paused. Tide Repository, module. Chooses between a live reading and the saved forecast.',
  },
  {
    event: 'detailOpen',
    input: { type: 'detailOpen', componentId: 'tide-repository' },
    expected: 'Tide Repository, module. Chooses between a live reading and the saved forecast.',
  },
  {
    event: 'detailOpen switch',
    input: { type: 'detailOpen', componentId: 'live-tide-client' },
    expected: 'Live Tide Client, service. Keeps the current tide reading in step.',
  },
  {
    event: 'detailClose',
    input: { type: 'detailClose', componentId: 'tide-repository' },
    expected: 'Tide Repository details closed.',
  },
  {
    event: 'caseStudyOpen',
    input: { type: 'caseStudyOpen' },
    expected: 'Case study: Tidewatch.',
  },
  {
    event: 'caseStudyClose',
    input: { type: 'caseStudyClose' },
    expected: 'Case study closed.',
  },
];

describe('announce', () => {
  test.each(CASES)('$event', ({ input, expected }) => {
    expect(announce(input, project)).toBe(expected);
  });

  test('prints the fixture A message table', () => {
    const rows = CASES.map(({ event, input }) => `${event}: ${announce(input, project)}`);
    rows.push(
      `detailOpen without summary: ${announce({ type: 'detailOpen', componentId: 'bare' }, noSummaryProject)}`,
    );

    console.log(['Fixture A announcement table', ...rows].join('\n'));
  });

  test('keeps detail-open announcements enabled by default', () => {
    expect(ANNOUNCE.detailOpen).toBe(true);
  });

  test('omits the summary when a component has none', () => {
    expect(announce({ type: 'detailOpen', componentId: 'bare' }, noSummaryProject)).toBe(
      'Bare, service.',
    );
  });
});
