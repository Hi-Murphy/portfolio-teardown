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
  OK: 'success: every artifact written / every gate assertion passed',
  INTERNAL: 'internal error (bug, unexpected exception)',
  USAGE: 'usage error: missing/invalid args, URL not `http(s)`, `--out` not writable',
  UNREACHABLE:
    'target unreachable: DNS/TLS/connection failure, document HTTP status >= 400, or preview not resolvable',
  BROWSER:
    'browser unavailable: Chromium missing or failed to launch (message prints the install command)',
  PARTIAL:
    'partial evidence (evidence CLI only): at least one artifact step failed; `meta.json.steps` says which; other artifacts still written',
  BUDGET: 'budget violated (gates and `fps --expect` only)',
};

export class CliError extends Error {
  readonly code: number;

  constructor(code: number, message: string) {
    super(message);
    this.name = 'CliError';
    this.code = code;
  }
}
