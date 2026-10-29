import { readFile } from 'node:fs/promises';

import { describe, expect, test } from 'vitest';

import { WEIGHT_BUDGET_BYTES } from '../src/budgets.ts';
import {
  aggregateWeight,
  assertWeight,
  type CdpNetEvent,
  type WeightProfileResult,
  type WeightReport,
} from '../src/weight.ts';

async function fixture(name: string): Promise<CdpNetEvent[]> {
  const contents = await readFile(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
  return JSON.parse(contents) as CdpNetEvent[];
}

function reportWith(
  base: WeightProfileResult,
  mobileBytes: number,
  desktopBytes: number,
): WeightReport {
  return {
    kind: 'weight',
    version: 1,
    url: 'https://example.test/',
    budgetBytes: WEIGHT_BUDGET_BYTES,
    profiles: {
      mobile: { ...base, totalBytes: mobileBytes },
      desktop: { ...base, totalBytes: desktopBytes },
    },
    pass: true,
  };
}

describe('aggregateWeight', () => {
  test('sums transfer bytes, attributes origins, and includes failed requests', async () => {
    const events = await fixture('net-events-initial-load.json');
    const result = aggregateWeight(events, 'https://example.test');

    expect(result).toMatchObject({
      totalBytes: 98_677,
      requests: 7,
      byOrigin: { first: 92_600, third: 6_077 },
      byType: {
        document: 2_400,
        script: 50_500,
        stylesheet: 12_800,
        image: 8_200,
        font: 24_000,
        fetch: 777,
      },
      pass: true,
    });
    expect(result.top[0]).toEqual({
      url: 'https://example.test/_next/static/chunks/app.js',
      type: 'script',
      bytes: 45_200,
      thirdParty: false,
    });
    expect(result.top.at(-1)).toEqual({
      url: 'https://metrics.example.net/beacon',
      type: 'fetch',
      bytes: 777,
      thirdParty: true,
    });
  });

  test('sorts requests by bytes and keeps only the largest ten', () => {
    const events: CdpNetEvent[] = [];
    for (let index = 0; index < 12; index += 1) {
      const requestId = `asset-${index}`;
      events.push({
        method: 'Network.requestWillBeSent',
        params: {
          requestId,
          type: 'Image',
          request: { url: `https://example.test/asset-${index}.png` },
        },
      });
      events.push({
        method: 'Network.loadingFinished',
        params: { requestId, encodedDataLength: (index + 1) * 100 },
      });
    }

    const result = aggregateWeight(events, 'https://example.test');

    expect(result.requests).toBe(12);
    expect(result.top).toHaveLength(10);
    expect(result.top.map((request) => request.bytes)).toEqual([
      1_200, 1_100, 1_000, 900, 800, 700, 600, 500, 400, 300,
    ]);
  });

  test('does not count the same loadingFinished event twice', () => {
    const result = aggregateWeight(
      [
        {
          method: 'Network.requestWillBeSent',
          params: {
            requestId: 'duplicate',
            type: 'Script',
            request: { url: 'https://example.test/app.js' },
          },
        },
        {
          method: 'Network.loadingFinished',
          params: { requestId: 'duplicate', encodedDataLength: 1234 },
        },
        {
          method: 'Network.loadingFinished',
          params: { requestId: 'duplicate', encodedDataLength: 1234 },
        },
      ],
      'https://example.test',
    );

    expect(result.totalBytes).toBe(1234);
    expect(result.requests).toBe(1);
  });
});

describe('assertWeight', () => {
  test('passes at 2,999,999 bytes for both profiles', async () => {
    const base = aggregateWeight(
      await fixture('net-events-initial-load.json'),
      'https://example.test',
    );
    const assertions = assertWeight(reportWith(base, 2_999_999, 2_999_999));

    expect(assertions).toHaveLength(2);
    expect(assertions.every((assertion) => assertion.pass)).toBe(true);
  });

  test('fails at exactly the 3,000,000-byte budget', async () => {
    const base = aggregateWeight(
      await fixture('net-events-initial-load.json'),
      'https://example.test',
    );
    const assertions = assertWeight(reportWith(base, 3_000_000, 2_999_999));

    expect(assertions.find((assertion) => assertion.profile === 'mobile')?.pass).toBe(false);
    expect(assertions.find((assertion) => assertion.profile === 'desktop')?.pass).toBe(true);
  });
});
