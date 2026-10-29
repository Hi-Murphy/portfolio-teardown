import { readFileSync } from 'node:fs';

import { describe, expect, test } from 'vitest';

import { EXIT, EXIT_DESCRIPTIONS } from '../src/exit-codes.ts';

type ExitDescription = readonly [code: number, description: string];

function parseExitTable(markdown: string): ExitDescription[] {
  const lines = markdown.split(/\r?\n/);
  const header = lines.findIndex((line) => /^\|\s*Code\s*\|\s*Meaning\s*\|$/.test(line.trim()));
  if (header === -1) throw new Error('EVIDENCE.md is missing the exit-code table');

  const rows: ExitDescription[] = [];
  for (const line of lines.slice(header + 2)) {
    if (!line.trim().startsWith('|')) break;

    const cells = line
      .trim()
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length !== 2 || !/^\d+$/.test(cells[0] ?? '')) {
      throw new Error(`malformed exit-code row: ${line}`);
    }

    rows.push([Number.parseInt(cells[0] ?? '', 10), cells[1] ?? '']);
  }
  return rows;
}

const evidenceUrl = new URL('../../../.specify/EVIDENCE.md', import.meta.url);
const documented = parseExitTable(readFileSync(evidenceUrl, 'utf8'));

describe('exit codes', () => {
  test('are unique and cover 0 through 6', () => {
    const codes = Object.values(EXIT);
    expect(new Set(codes).size).toBe(codes.length);
    expect([...codes].sort((left, right) => left - right)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  test('EVIDENCE.md exit table equals EXIT and EXIT_DESCRIPTIONS', () => {
    const expected = Object.entries(EXIT)
      .map(([name, code]) => [code, EXIT_DESCRIPTIONS[name as keyof typeof EXIT]] as const)
      .sort(([left], [right]) => left - right);

    expect(documented).toEqual(expected);
  });
});
