import { resolve } from 'node:path';
import { parseArgs, type ParseArgsOptionsConfig, type ParseArgsOptionsType } from 'node:util';

import { CliError, EXIT } from './exit-codes.ts';

export type CliOptionValue = string | boolean | string[] | boolean[];

export interface ParsedCli {
  values: Record<string, CliOptionValue | undefined>;
  positionals: string[];
}

export interface CliSpec {
  options?: ParseArgsOptionsConfig;
  allowPositionals?: boolean;
  requiredPositionals?: number;
  allowNegative?: boolean;
}

export type CliOptionType = ParseArgsOptionsType;

export function parseCli<T>(argv: string[], spec: CliSpec): T {
  let parsed: ParsedCli;

  try {
    parsed = parseArgs({
      args: argv,
      options: spec.options,
      strict: true,
      allowPositionals: spec.allowPositionals ?? true,
      allowNegative: spec.allowNegative,
    }) as ParsedCli;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new CliError(EXIT.USAGE, message);
  }

  const requiredPositionals = spec.requiredPositionals ?? 0;
  if (parsed.positionals.length < requiredPositionals) {
    const missing = requiredPositionals - parsed.positionals.length;
    throw new CliError(
      EXIT.USAGE,
      `missing ${missing} required positional${missing === 1 ? '' : 's'}`,
    );
  }

  if (Object.hasOwn(parsed.values, 'out') && typeof parsed.values.out === 'string') {
    parsed.values.out = resolve(process.cwd(), parsed.values.out);
  }

  return parsed as T;
}

export function parseUrl(raw: string | undefined): URL {
  const value = raw?.trim();
  if (!value) {
    throw new CliError(EXIT.USAGE, 'missing URL');
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new CliError(EXIT.USAGE, `invalid URL: ${value}`);
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new CliError(EXIT.USAGE, `URL must use http or https: ${value}`);
  }

  return url;
}
