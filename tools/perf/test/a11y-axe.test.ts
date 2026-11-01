import { readFile } from 'node:fs/promises';

import { describe, expect, test } from 'vitest';

import {
  axeVerdict,
  parseAxeSelection,
  type AxeScanResults,
  type DimLedgerSource,
} from '../src/a11y-axe.ts';
import { CliError, EXIT } from '../src/exit-codes.ts';

async function fixture(name: 'clean' | 'serious' | 'dim-contrast'): Promise<AxeScanResults> {
  return JSON.parse(
    await readFile(new URL(`./fixtures/axe-${name}.json`, import.meta.url), 'utf8'),
  ) as AxeScanResults;
}

const FIXTURE_LAYERS: readonly DimLedgerSource[] = [
  { selector: '#dimmed-copy', layer: 'data', opacity: 0.28 },
];

describe('a11y axe verdict', () => {
  test('a clean result exits 0', async () => {
    const verdict = axeVerdict(await fixture('clean'));

    expect(verdict.exitCode).toBe(EXIT.OK);
    expect(verdict.failing).toEqual([]);
    expect(verdict.ledger).toEqual([]);
  });

  test('a serious violation exits 6 and keeps the rule id', async () => {
    const verdict = axeVerdict(await fixture('serious'));

    expect(verdict.exitCode).toBe(EXIT.BUDGET);
    expect(verdict.counts.serious).toBe(1);
    expect(verdict.failing.map((result) => result.id)).toContain('button-name');
  });

  test('a fully dimmed contrast violation is ledger-only and exits 0', async () => {
    const verdict = axeVerdict(await fixture('dim-contrast'), { dimLedger: FIXTURE_LAYERS });

    expect(verdict.exitCode).toBe(EXIT.OK);
    expect(verdict.failing).toEqual([]);
    expect(verdict.ledger).toEqual([
      { selector: '#dimmed-copy', ratio: 2.51, layer: 'data', opacity: 0.28 },
    ]);
  });

  test('one untagged contrast node keeps the violation and exits 6', async () => {
    const source = await fixture('dim-contrast');
    const result = source.violations[0];
    const node = result?.nodes[0];
    if (result === undefined || node === undefined)
      throw new Error('dim-contrast fixture is malformed');

    const verdict = axeVerdict(
      {
        ...source,
        violations: [
          {
            ...result,
            nodes: [{ ...node, target: ['#live-copy'] }, node],
          },
        ],
      },
      { dimLedger: FIXTURE_LAYERS },
    );

    expect(verdict.exitCode).toBe(EXIT.BUDGET);
    expect(verdict.counts.serious).toBe(1);
    expect(verdict.failing[0]?.nodes.map((entry) => entry.target)).toEqual([['#live-copy']]);
    expect(verdict.ledger).toHaveLength(1);
  });

  test('an unknown state is a usage error', () => {
    try {
      parseAxeSelection('a-idle,not-a-state', ['a-idle', 'b-idle']);
      throw new Error('expected parseAxeSelection to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(CliError);
      expect((error as CliError).code).toBe(EXIT.USAGE);
    }
  });
  test('a ledger entry at full opacity does not hide a contrast violation (R3 race guard)', async () => {
    const verdict = axeVerdict(await fixture('dim-contrast'), {
      dimLedger: [{ selector: '#dimmed-copy', layer: 'data', opacity: 1 }],
    });

    expect(verdict.exitCode).toBe(EXIT.BUDGET);
    expect(verdict.ledger).toEqual([]);
  });
});
