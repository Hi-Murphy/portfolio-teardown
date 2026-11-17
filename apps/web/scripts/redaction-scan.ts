export interface Pattern {
  id: string;
  cls: 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F6' | 'F8' | 'F9';
  source: string;
  flags: string;
  scope: 'all' | 'content';
}

export interface Hit {
  cls: Pattern['cls'];
  patternId: string;
  file: string;
  offset: number;
  match: string;
  jsonPath?: string;
  ruleId?: string;
}

export interface BuildReport {
  raw: number;
  exempted: Record<string, number>;
  unexempted: Hit[];
  byRoute: Record<string, { raw: number; exempted: Record<string, number>; unexempted: number }>;
}

export interface LedgerEntry {
  cls: Pattern['cls'];
  patternId: string;
  match: string;
  reason: string;
}

export const PATTERNS: readonly Pattern[] = [
  {
    id: 'ipv4',
    cls: 'F1',
    source: String.raw`\b\d{1,3}(\.\d{1,3}){3}\b`,
    flags: 'g',
    scope: 'all',
  },
  {
    id: 'ipv6',
    cls: 'F1',
    source: String.raw`\b[0-9a-f]{2,}(?::[0-9a-f]{0,4}){2,}\b`,
    flags: 'gi',
    scope: 'all',
  },
  {
    id: 'host',
    cls: 'F2',
    source: String.raw`\b[a-z0-9-]+\.(local|internal|lan)\b`,
    flags: 'g',
    scope: 'all',
  },
  { id: 'ssh', cls: 'F2', source: 'ssh [a-z]', flags: 'g', scope: 'all' },
  { id: 'ghp_', cls: 'F3', source: 'ghp_', flags: 'g', scope: 'all' },
  { id: 'github_pat_', cls: 'F3', source: 'github_pat_', flags: 'g', scope: 'all' },
  { id: 'sk-', cls: 'F3', source: 'sk-[A-Za-z0-9]', flags: 'g', scope: 'all' },
  { id: 'AKIA', cls: 'F3', source: 'AKIA', flags: 'g', scope: 'all' },
  { id: 'xox', cls: 'F3', source: 'xox[bp]-', flags: 'g', scope: 'all' },
  { id: 'BEGIN', cls: 'F3', source: '-----BEGIN', flags: 'g', scope: 'all' },
  { id: 'eyJ', cls: 'F3', source: 'eyJ', flags: 'g', scope: 'all' },
  {
    id: 'Bearer',
    cls: 'F3',
    source: 'Bearer [A-Za-z0-9._~+/-]+=*',
    flags: 'g',
    scope: 'all',
  },
  {
    id: 'github-url',
    cls: 'F4',
    source: String.raw`github\.com[/:][\w.-]+/[\w.-]+`,
    flags: 'g',
    scope: 'all',
  },
  { id: 'bare', cls: 'F4', source: String.raw`\b[\w-]+/[\w.-]+\b`, flags: 'g', scope: 'content' },
  { id: 'snowflake', cls: 'F5', source: String.raw`\b\d{17,19}\b`, flags: 'g', scope: 'all' },
  {
    id: 'discord-token',
    cls: 'F5',
    source: String.raw`\b[MNO][\w-]{23,25}\.[\w-]{6}\.[\w-]{27,}\b`,
    flags: 'g',
    scope: 'all',
  },
  {
    id: 'telegram-token',
    cls: 'F5',
    source: String.raw`\b\d{8,10}:[\w-]{35}\b`,
    flags: 'g',
    scope: 'all',
  },
  { id: 'home', cls: 'F6', source: String.raw`/home/\w+/`, flags: 'g', scope: 'all' },
  { id: 'users', cls: 'F6', source: String.raw`/Users/\w+/`, flags: 'g', scope: 'all' },
  { id: 'tilde', cls: 'F6', source: '~/[A-Za-z]', flags: 'g', scope: 'all' },
  {
    id: 'account-id',
    cls: 'F8',
    source: String.raw`\b(?:org|proj|prj|team|acct|cus|sub)[-_][A-Za-z0-9]{8,}\b`,
    flags: 'g',
    scope: 'all',
  },
  {
    id: 'email',
    cls: 'F9',
    source: String.raw`[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}`,
    flags: 'g',
    scope: 'all',
  },
  {
    id: 'phone',
    cls: 'F9',
    source: String.raw`(?:\+\d{1,3}[ .-]?)?\(?\d{2,4}\)?[ .-]\d{3,4}[ .-]\d{3,4}\b`,
    flags: 'g',
    scope: 'all',
  },
];

export const LEDGER: readonly LedgerEntry[] = [];

export function scanText(
  _text: string,
  _file: string,
  _scope: 'content' | 'build',
  _patterns: readonly Pattern[] = PATTERNS,
): Hit[] {
  return [];
}

export function scanContent(_path: string): Hit[] {
  return [];
}

export function scanBuild(_outDir: string): BuildReport {
  return { raw: 0, exempted: {}, unexempted: [], byRoute: {} };
}

export function exemptionFor(_hit: Hit, _text: string): string | undefined {
  return undefined;
}
