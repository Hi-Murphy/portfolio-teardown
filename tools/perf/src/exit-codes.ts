export const EXIT = {
  OK: 0,
  INTERNAL: 1,
  USAGE: 2,
  UNREACHABLE: 3,
  BROWSER: 4,
  PARTIAL: 5,
  BUDGET: 6,
} as const;

export const EXIT_DESCRIPTIONS: Record<keyof typeof EXIT, string> = {
  OK: 'ok',
  INTERNAL: 'internal error',
  USAGE: 'usage error',
  UNREACHABLE: 'unreachable',
  BROWSER: 'browser unavailable',
  PARTIAL: 'partial evidence',
  BUDGET: 'budget violated',
};

export class CliError extends Error {
  readonly code: number;

  constructor(code: number, message: string) {
    super(message);
    this.name = 'CliError';
    this.code = code;
  }
}
