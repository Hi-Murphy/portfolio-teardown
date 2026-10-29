import { resolve } from 'node:path';

import { describe, expect, test } from 'vitest';

import { parseCli, parseUrl } from '../src/args.ts';
import { CliError, EXIT } from '../src/exit-codes.ts';

describe('parseCli', () => {
  test('parses options and positionals', () => {
    const parsed = parseCli<{
      values: { count?: string; verbose?: boolean };
      positionals: string[];
    }>(['--count', '3', '--verbose', 'item'], {
      options: {
        count: { type: 'string' },
        verbose: { type: 'boolean' },
      },
      allowPositionals: true,
    });

    expect(parsed.values).toMatchObject({ count: '3', verbose: true });
    expect(parsed.positionals).toEqual(['item']);
  });

  test('rejects unknown flags as usage errors', () => {
    expect(() =>
      parseCli([], {
        options: {},
        allowPositionals: true,
      }),
    ).not.toThrow();

    expect(() => parseCli(['--unknown'], { options: {}, allowPositionals: true })).toThrow(
      CliError,
    );

    try {
      parseCli(['--unknown'], { options: {}, allowPositionals: true });
    } catch (error) {
      expect(error).toBeInstanceOf(CliError);
      expect((error as CliError).code).toBe(EXIT.USAGE);
    }
  });

  test('rejects a missing required positional', () => {
    try {
      parseCli([], { allowPositionals: true, requiredPositionals: 1 });
      throw new Error('expected parseCli to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(CliError);
      expect((error as CliError).code).toBe(EXIT.USAGE);
    }
  });

  test('resolves a relative --out against the process cwd', () => {
    const parsed = parseCli<{ values: { out: string }; positionals: string[] }>(
      ['--out', 'relative/evidence'],
      {
        options: { out: { type: 'string' } },
        allowPositionals: false,
      },
    );

    expect(parsed.values.out).toBe(resolve(process.cwd(), 'relative/evidence'));
  });
});

describe('parseUrl', () => {
  test('requires an http or https URL', () => {
    expect(parseUrl('https://example.com/path').href).toBe('https://example.com/path');

    for (const value of [undefined, '', 'not a url', 'ftp://example.com/file']) {
      try {
        parseUrl(value);
        throw new Error(`expected ${String(value)} to fail`);
      } catch (error) {
        expect(error).toBeInstanceOf(CliError);
        expect((error as CliError).code).toBe(EXIT.USAGE);
      }
    }
  });
});
