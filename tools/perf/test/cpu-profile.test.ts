import { describe, expect, test } from 'vitest';

import {
  PROFILE_TASK_THRESHOLD_MS,
  summarizeCpuProfile,
  type CpuProfile,
  type CpuProfileTask,
} from '../src/cpu-profile.ts';

function profile(): CpuProfile {
  const nodes = [
    {
      id: 1,
      callFrame: { functionName: 'chunkA', url: 'https://example.test/_next/static/chunks/a.js' },
    },
    {
      id: 2,
      callFrame: { functionName: 'chunkB', url: 'https://example.test/_next/static/chunks/b.js' },
    },
  ];
  const samples: number[] = [];
  const timeDeltas: number[] = [];

  for (let millisecond = 1; millisecond <= 60; millisecond += 1) {
    samples.push(millisecond > 20 ? 2 : 1);
    timeDeltas.push(1000);
  }

  return {
    nodes,
    startTime: 1_000_000,
    endTime: 1_060_000,
    samples,
    timeDeltas,
  };
}

function taskSelfMs(task: CpuProfileTask, key: 'byChunk' | 'topFunctions'): number {
  return task[key].reduce((sum, entry) => sum + entry.selfMs, 0);
}

describe('summarizeCpuProfile', () => {
  test('attributes only tasks above 16.7 ms and keeps self time within task duration', () => {
    const summary = summarizeCpuProfile(
      profile(),
      [
        { startUs: 1_010_000, durUs: 20_000 },
        { startUs: 1_030_000, durUs: 18_000 },
        { startUs: 1_050_000, durUs: 10_000 },
      ],
      {
        route: '/projects/example',
        engage: 'move',
        run: 1,
        traceTimeOriginUs: 900_000,
      },
    );

    expect(summary.tasks).toHaveLength(2);
    expect(summary.tasks.map((task) => task.dur)).toEqual([20, 18]);
    expect(PROFILE_TASK_THRESHOLD_MS).toBe(16.7);

    for (const task of summary.tasks) {
      expect(taskSelfMs(task, 'byChunk')).toBeLessThanOrEqual(task.dur);
      expect(taskSelfMs(task, 'topFunctions')).toBeLessThanOrEqual(task.dur);
      expect(task.byChunk.every((entry) => entry.pct >= 0 && entry.pct <= 100)).toBe(true);
      expect(task.topFunctions.every((entry) => entry.pct >= 0 && entry.pct <= 100)).toBe(true);
    }

    expect(summary.tasks[0]?.byChunk).toEqual([
      { chunk: 'a.js', selfMs: 10, pct: 50 },
      { chunk: 'b.js', selfMs: 10, pct: 50 },
    ]);
    expect(summary.tasks[0]?.topFunctions).toEqual([
      { fn: 'chunkA', chunk: 'a.js', selfMs: 10, pct: 50 },
      { fn: 'chunkB', chunk: 'b.js', selfMs: 10, pct: 50 },
    ]);
  });
});
