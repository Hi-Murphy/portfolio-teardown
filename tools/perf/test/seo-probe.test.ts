import { readFileSync } from 'node:fs';

import { JSDOM } from 'jsdom';
import { describe, expect, test } from 'vitest';

import {
  classifyUrlEvidence,
  compareUrlSets,
  evaluateMetaTags,
  parsePngIhdr,
  validateSchemaVocabulary,
  type EvidenceUrl,
  type ExpectedTag,
  type SchemaVocabulary,
} from '../src/seo-probe.ts';

const vocabulary = JSON.parse(
  readFileSync(new URL('../src/schema-vocab.json', import.meta.url), 'utf8'),
) as SchemaVocabulary;

function head(html: string): HTMLElement {
  return new JSDOM(`<!doctype html><html><head>${html}</head><body></body></html>`).window.document
    .head;
}

function pngHeader(width: number, height: number): Buffer {
  const bytes = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(bytes, 0);
  bytes.writeUInt32BE(13, 8);
  bytes.write('IHDR', 12, 'ascii');
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  return bytes;
}

describe('PNG IHDR parser', () => {
  test('reads dimensions and SHA-256 from an IHDR header', () => {
    const parsed = parsePngIhdr(pngHeader(1200, 630));

    expect(parsed?.width).toBe(1200);
    expect(parsed?.height).toBe(630);
    expect(parsed?.bytes).toBe(24);
    expect(parsed?.sha256).toMatch(/^[a-f0-9]{64}$/u);
  });

  test('rejects a bad signature, a non-IHDR chunk, or a truncated header', () => {
    const badSignature = pngHeader(1200, 630);
    badSignature[0] = 0;
    expect(parsePngIhdr(badSignature)).toBeUndefined();

    const badChunk = pngHeader(1200, 630);
    badChunk.write('IDAT', 12, 'ascii');
    expect(parsePngIhdr(badChunk)).toBeUndefined();
    expect(parsePngIhdr(pngHeader(1200, 630).subarray(0, 23))).toBeUndefined();
  });
});

describe('schema vocabulary check', () => {
  test('accepts a valid Person document', () => {
    const checks = validateSchemaVocabulary(
      {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: 'Person Name',
        jobTitle: 'Engineer',
        url: 'https://example.com',
        sameAs: ['https://example.com/profile'],
      },
      vocabulary,
    );

    expect(checks.every((check) => check.pass)).toBe(true);
  });

  test('fails an unknown property', () => {
    const checks = validateSchemaVocabulary(
      { '@context': 'https://schema.org', '@type': 'Person', nickname: 'Unknown' },
      vocabulary,
    );

    expect(checks.some((check) => !check.pass && check.name.includes('nickname'))).toBe(true);
  });

  test('fails a known property used on the wrong type', () => {
    const checks = validateSchemaVocabulary(
      {
        '@context': 'https://schema.org',
        '@type': 'Person',
        codeRepository: 'https://example.com/repo',
      },
      vocabulary,
    );

    expect(
      checks.some(
        (check) => !check.pass && check.name.includes('codeRepository is valid for its @type'),
      ),
    ).toBe(true);
  });
});

describe('host-leak classifier', () => {
  const siteUrl = 'https://hi-murphy.me';
  const contentUrls = new Set(['https://github.com/example/repo']);

  function failures(evidence: EvidenceUrl[]): readonly string[] {
    return classifyUrlEvidence(evidence, siteUrl, contentUrls).map((finding) => finding.reason);
  }

  test('accepts the configured origin and a verbatim content-sourced external URL', () => {
    expect(
      failures([
        { value: siteUrl, kind: 'self', source: 'canonical' },
        {
          value: 'https://github.com/example/repo',
          kind: 'sameAs',
          source: 'sameAs.0',
        },
      ]),
    ).toEqual([]);
  });

  for (const value of [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://portfolio-teardown.vercel.app',
    'https://evil.example',
  ]) {
    test(`fails a self URL at ${value}`, () => {
      expect(failures([{ value, kind: 'self', source: 'canonical' }]).length).toBeGreaterThan(0);
    });
  }

  test('fails a sameAs value that is not verbatim content', () => {
    expect(
      failures([{ value: 'https://github.com/example/other', kind: 'sameAs', source: 'sameAs.0' }]),
    ).toContain('sameAs is not a verbatim content URL');
  });
});

describe('sitemap URL set equality', () => {
  const expected = ['https://hi-murphy.me', 'https://hi-murphy.me/projects'];

  test('passes only when the sets are equal', () => {
    expect(compareUrlSets([...expected].reverse(), expected).pass).toBe(true);
  });

  test('reports a missing URL and an extra URL', () => {
    const difference = compareUrlSets(
      ['https://hi-murphy.me', 'https://hi-murphy.me/dev/engine'],
      expected,
    );

    expect(difference.pass).toBe(false);
    expect(difference.missing).toEqual(['https://hi-murphy.me/projects']);
    expect(difference.extra).toEqual(['https://hi-murphy.me/dev/engine']);
  });
});

describe('og:image tag assertions', () => {
  const imageTag: ExpectedTag = {
    tag: 'meta',
    attribute: 'property',
    key: 'og:image',
    value: 'https://hi-murphy.me/og/home.png',
  };

  test('accepts an absolute og:image', () => {
    const checks = evaluateMetaTags(
      head('<meta property="og:image" content="https://hi-murphy.me/og/home.png">'),
      [imageTag],
    );

    expect(checks.every((check) => check.pass)).toBe(true);
  });

  test('fails a missing og:image', () => {
    expect(evaluateMetaTags(head(''), [imageTag]).some((check) => !check.pass)).toBe(true);
  });

  test('fails a relative og:image even when the expected value is relative', () => {
    const checks = evaluateMetaTags(head('<meta property="og:image" content="/og/home.png">'), [
      { ...imageTag, value: '/og/home.png' },
    ]);

    expect(checks.some((check) => !check.pass && check.name.includes('absolute'))).toBe(true);
  });
});
