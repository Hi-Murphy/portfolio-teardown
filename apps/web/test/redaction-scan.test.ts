import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, test } from 'vitest';

import {
  PATTERNS,
  exemptionFor,
  scanBuild,
  scanContent,
  scanText,
  type Hit,
  type Pattern,
} from '../scripts/redaction-scan';

const ip = '192.0.2.' + 44;
const token = 'gh' + 'p_' + 'CANARY0canary0';
const repo = 'github.com/' + 'canary-owner/canary-private-repo';
const canary = `deploy ${ip} with ${token} from ${repo}`;

const tempDirs: string[] = [];

afterEach(() => {
  for (const directory of tempDirs.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function makeTempDir(): string {
  const directory = mkdtempSync(join(tmpdir(), 'redaction-scan-'));
  tempDirs.push(directory);
  return directory;
}

function writeFile(root: string, relativePath: string, contents: string): void {
  const path = join(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
}

function classes(hits: Hit[]): string[] {
  return hits.map((hit) => hit.cls).sort();
}

function scanSingleFile(contents: string, extension: 'html' | 'js'): Hit[] {
  const directory = makeTempDir();
  writeFile(directory, `synthetic.${extension}`, contents);
  return scanBuild(directory).unexempted;
}

function findPattern(cls: Pattern['cls'], id: string): Pattern {
  const pattern = PATTERNS.find((candidate) => candidate.cls === cls && candidate.id === id);
  if (pattern === undefined) {
    throw new Error(`Missing pattern ${cls} ${id}`);
  }
  return pattern;
}

describe('redaction scanner canary', () => {
  test('G3 content reports the canary in a JSON description', () => {
    const directory = makeTempDir();
    const path = join(directory, 'content.json');
    writeFileSync(path, JSON.stringify({ layers: [{ description: canary }] }));

    const hits = scanContent(path);

    expect(hits).toHaveLength(3);
    expect(classes(hits)).toEqual(['F1', 'F3', 'F4']);
    expect(hits.map((hit) => hit.jsonPath)).toEqual([
      'layers[0].description',
      'layers[0].description',
      'layers[0].description',
    ]);
  });

  test('G3 build reports the canary once from HTML, text and JavaScript', () => {
    const directory = makeTempDir();
    writeFile(directory, 'index.html', `<p>${canary}</p>`);
    writeFile(directory, 'index.txt', `0:["$","p",null,{"children":"${canary}"}]`);
    writeFile(directory, '_next/static/chunks/a.js', `var s="${canary}";`);

    const report = scanBuild(directory);

    expect(report.unexempted).toHaveLength(9);
    for (const file of ['index.html', 'index.txt', '_next/static/chunks/a.js']) {
      expect(classes(report.unexempted.filter((hit) => hit.file === file))).toEqual([
        'F1',
        'F3',
        'F4',
      ]);
    }
  });

  test('the canary mutation without ghp_ has two hits', () => {
    const withoutGhp = PATTERNS.filter((pattern) => pattern.id !== 'ghp_');

    expect(scanText(canary, 'canary.txt', 'content', withoutGhp)).toHaveLength(2);
  });
});

describe('redaction ledger negatives', () => {
  const cases: readonly {
    text: string;
    cls: Pattern['cls'];
    patternId: string;
    name: string;
  }[] = [
    { text: 'server 198.51.100.12. ok', cls: 'F1', patternId: 'ipv4', name: 'X1 ipv4' },
    {
      text: 'id 123456789012345678 ok',
      cls: 'F5',
      patternId: 'snowflake',
      name: 'X1 snowflake',
    },
    { text: 'v="fe80::1"', cls: 'F1', patternId: 'ipv6', name: 'X2 ipv6' },
    { text: 'v="2001:db8::1"', cls: 'F1', patternId: 'ipv6', name: 'X2 ipv6 hex' },
    { text: ' sk-abc123', cls: 'F3', patternId: 'sk-', name: 'X3 leading space' },
    { text: '"sk-proj123', cls: 'F3', patternId: 'sk-', name: 'X3 leading quote' },
    { text: '=sk-x1', cls: 'F3', patternId: 'sk-', name: 'X3 equals sign' },
    { text: '"db.internal"', cls: 'F2', patternId: 'host', name: 'X4 quoted host' },
    { text: 'http://db.internal/', cls: 'F2', patternId: 'host', name: 'X4 URL host' },
    { text: '@host.lan ', cls: 'F2', patternId: 'host', name: 'X4 handle host' },
    { text: 'someone@example.com', cls: 'F9', patternId: 'email', name: 'X5 other email' },
    {
      text: '1234567890123456789',
      cls: 'F5',
      patternId: 'snowflake',
      name: 'X6 other int64',
    },
  ];

  for (const entry of cases) {
    test(`${entry.name} remains unexempted in JavaScript and HTML`, () => {
      for (const extension of ['js', 'html'] as const) {
        const unexempted = scanSingleFile(entry.text, extension);
        expect(
          unexempted.some((hit) => hit.cls === entry.cls && hit.patternId === entry.patternId),
          `${entry.name} (${extension})`,
        ).toBe(true);
      }
    });
  }

  test('X4 colon before host remains unexempted in JavaScript', () => {
    const unexempted = scanSingleFile('var h="host:db.internal:22";', 'js');

    expect(unexempted.some((hit) => hit.cls === 'F2' && hit.patternId === 'host')).toBe(true);
  });
});

describe('redaction ledger positives', () => {
  const site = JSON.parse(
    readFileSync(new URL('../../../.specify/content/site.json', import.meta.url), 'utf8'),
  ) as { identity: { email?: string; links: { url: string | null }[] } };
  const contactEmail =
    site.identity.email ??
    site.identity.links.find((link) => link.url?.startsWith('mailto:'))?.url?.slice(7);

  if (contactEmail === undefined) {
    throw new Error('site.json has no public contact email');
  }

  const cases: readonly { text: string; extension: 'html' | 'js'; ruleId: string; name: string }[] =
    [
      {
        text: '<path d="M1-.27.38.01.53.34"/>',
        extension: 'html',
        ruleId: 'X1',
        name: 'X1 SVG geometry',
      },
      { text: '0.19999999999999996', extension: 'html', ruleId: 'X1', name: 'X1 float fraction' },
      { text: 'e?27:5:26', extension: 'js', ruleId: 'X2', name: 'X2 JS ternary' },
      { text: 'mask-image:none', extension: 'html', ruleId: 'X3', name: 'X3 mid-word sk-' },
      {
        text: 'a.internal.interaction',
        extension: 'js',
        ruleId: 'X4',
        name: 'X4 JS member',
      },
      {
        text: 'x?1:r.internal.frames',
        extension: 'js',
        ruleId: 'X4',
        name: 'X4 JS ternary member',
      },
      { text: contactEmail, extension: 'html', ruleId: 'X5', name: 'X5 public contact' },
      { text: '9223372036854775807', extension: 'html', ruleId: 'X6', name: 'X6 int64 bound' },
    ];

  for (const entry of cases) {
    test(`${entry.name} is exempted by ${entry.ruleId}`, () => {
      const directory = makeTempDir();
      writeFile(directory, `synthetic.${entry.extension}`, entry.text);
      const report = scanBuild(directory);

      expect(report.exempted[entry.ruleId]).toBeGreaterThan(0);
      expect(report.unexempted).toHaveLength(0);
    });
  }

  test('exemptionFor applies the same verdict to a direct hit', () => {
    const text = '<path d="M1-.27.38.01.53.34"/>';
    const hit = scanText(text, 'synthetic.html', 'build').find(
      (candidate) => candidate.cls === 'F1',
    );
    expect(hit).toBeDefined();
    expect(exemptionFor(hit as Hit, text)).toBe('X1');
  });
});

describe('redaction scanner content and patterns', () => {
  test('G1 scans the canonical agent-fleet content with zero hits', () => {
    const path = fileURLToPath(
      new URL('../../../.specify/content/agent-fleet.json', import.meta.url),
    );
    expect(scanContent(path)).toHaveLength(0);
  });

  test('pattern sources match the brief verbatim', () => {
    expect(findPattern('F1', 'ipv4').source).toBe(String.raw`\b\d{1,3}(\.\d{1,3}){3}\b`);
    expect(findPattern('F1', 'ipv6').source).toBe(
      String.raw`\b[0-9a-f]{2,}(?::[0-9a-f]{0,4}){2,}\b`,
    );
    expect(
      PATTERNS.filter((pattern) => pattern.cls === 'F2').map((pattern) => pattern.source),
    ).toEqual([String.raw`\b[a-z0-9-]+\.(local|internal|lan)\b`, 'ssh [a-z]']);
    expect(
      PATTERNS.filter((pattern) => pattern.cls === 'F3').map((pattern) => pattern.source),
    ).toEqual([
      'ghp_',
      'github_pat_',
      'sk-[A-Za-z0-9]',
      'AKIA',
      'xox[bp]-',
      '-----BEGIN',
      'eyJ',
      'Bearer [A-Za-z0-9._~+/-]+=*',
    ]);
    expect(findPattern('F5', 'snowflake').source).toBe(String.raw`\b\d{17,19}\b`);
    expect(
      PATTERNS.filter((pattern) => pattern.cls === 'F6').map((pattern) => pattern.source),
    ).toEqual([String.raw`/home/\w+/`, String.raw`/Users/\w+/`, '~/[A-Za-z]']);
  });
});
