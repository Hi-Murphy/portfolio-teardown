import { describe, expect, test } from 'vitest';

import {
  classifyWebgl,
  hostAttemptId,
  parseHostMeta,
  sanitizeHostValue,
  summariseBenchmarkIndex,
  type HostMeta,
} from '../src/cli/host-meta.ts';

const HOST_META: HostMeta = {
  attemptId: '123-2-s1',
  runnerName: 'GitHub Actions 7',
  imageVersion: '20261101.1.0',
  chromium: '145.0.7632.6',
  benchmarkIndex: { min: 2050, median: 2100, max: 2200 },
  webgl: {
    available: true,
    renderer: 'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device), SwiftShader driver)',
    vendor: 'Google Inc. (Google)',
    backend: 'swiftshader',
  },
  git: { sha: '0123456789abcdef' },
};

describe('host meta', () => {
  test('summarises the three benchmark samples', () => {
    expect(summariseBenchmarkIndex([2200, 2050, 2100])).toEqual({
      min: 2050,
      median: 2100,
      max: 2200,
    });
    expect(summariseBenchmarkIndex([1900, 2000])).toEqual({
      min: 1900,
      median: 1950,
      max: 2000,
    });
  });

  test('classifies SwiftShader, ANGLE vendor backends, and no WebGL', () => {
    expect(classifyWebgl(HOST_META.webgl).backend).toBe('swiftshader');
    expect(
      classifyWebgl({
        available: true,
        vendor: 'Google Inc. (Apple)',
        renderer: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M4, Unspecified Version)',
      }).backend,
    ).toBe('angle-apple');
    expect(classifyWebgl({ available: false, renderer: null, vendor: null })).toEqual({
      available: false,
      renderer: null,
      vendor: null,
      backend: 'none',
    });
  });

  test('sanitises runner and local home paths', () => {
    const runner = {
      CI: 'true',
      HOME: '/home/runner',
      RUNNER_WORKSPACE: '/home/runner/work/example/example',
    };
    expect(
      sanitizeHostValue('/home/runner/work/example/example/out /home/runner/.cache', runner),
    ).toBe('<runner-home>/out <runner-home>/.cache');

    expect(sanitizeHostValue('/Users/example/project/out', { HOME: '/Users/example' })).toBe(
      '<local-path>/project/out',
    );
  });

  test('builds an attempt id only when run id, attempt and shard are present', () => {
    expect(hostAttemptId({ GITHUB_RUN_ID: '123', GITHUB_RUN_ATTEMPT: '2', SHARD: '1' })).toBe(
      '123-2-s1',
    );
    expect(hostAttemptId({ GITHUB_RUN_ID: '123', GITHUB_RUN_ATTEMPT: '2' })).toBe('local');
  });

  test('parses a complete host-meta file and rejects an invalid backend', () => {
    expect(parseHostMeta(JSON.stringify(HOST_META))).toEqual(HOST_META);

    const invalid = {
      ...HOST_META,
      webgl: { ...HOST_META.webgl, backend: 'software' },
    };
    expect(() => parseHostMeta(JSON.stringify(invalid))).toThrow(/invalid host meta/);
  });
});
