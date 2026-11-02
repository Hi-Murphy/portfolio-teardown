import { createHash } from 'node:crypto';
import { readFile, readdir, stat, writeFile, mkdir } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';

import { JSDOM } from 'jsdom';
import ogs from 'open-graph-scraper';

export const SEO_PROBE_STEPS = [
  'meta',
  'unfurl',
  'card',
  'sitemap-robots',
  'json-ld',
  'host-leak',
] as const;

export type SeoProbeStep = (typeof SEO_PROBE_STEPS)[number];

export interface ExpectedTag {
  readonly tag: 'title' | 'meta' | 'link';
  readonly attribute?: 'name' | 'property' | 'rel';
  readonly key?: string;
  readonly value: string;
}

export interface ExpectedRoute {
  readonly path: string;
  readonly kind: 'home' | 'projects' | 'project';
  readonly canonical: string;
  readonly ogImagePath: string;
  readonly title: string;
  readonly description: string;
  readonly tags: readonly ExpectedTag[];
  readonly jsonLd?: Record<string, unknown>;
}

export interface ExpectedLink {
  readonly rel: string;
  readonly href: string;
  readonly type?: string;
}

export interface ExpectedThemeColor {
  readonly media: string;
  readonly content: string;
}

export interface SeoExpectation {
  readonly schemaVersion: 1;
  readonly siteUrl: string;
  readonly routes: readonly ExpectedRoute[];
  readonly everyPage: {
    readonly links: readonly ExpectedLink[];
    readonly themeColors: readonly ExpectedThemeColor[];
  };
}

export interface CheckResult {
  readonly name: string;
  readonly pass: boolean;
  readonly detail: string;
}

export interface StepResult {
  readonly step: SeoProbeStep;
  readonly pass: boolean;
  readonly checks: readonly CheckResult[];
}

export interface RouteProbe {
  readonly path: string;
  readonly kind: ExpectedRoute['kind'];
  readonly htmlPath: string;
  readonly pass: boolean;
  readonly steps: readonly StepResult[];
}

export interface HtmlCoverage {
  readonly htmlPath: string;
  readonly routePath: string;
  readonly pass: boolean;
  readonly checks: readonly CheckResult[];
}

export interface CardHash {
  readonly route: string;
  readonly path: string;
  readonly bytes: number;
  readonly sha256: string;
}

export interface UnfurlView {
  readonly route: string;
  readonly title: string | undefined;
  readonly description: string | undefined;
  readonly image: string | undefined;
  readonly width: number | undefined;
  readonly height: number | undefined;
  readonly card: string | undefined;
  readonly pass: boolean;
  readonly error: string | undefined;
}

export interface SeoProbeReport {
  readonly schemaVersion: 1;
  readonly result: 'PASS' | 'FAIL';
  readonly siteUrl: string;
  readonly outDir: string;
  readonly expectationPath: string;
  readonly routes: readonly RouteProbe[];
  readonly htmlCoverage: readonly HtmlCoverage[];
  readonly sitemapRobots: StepResult;
  readonly unfurl: readonly UnfurlView[];
  readonly cards: readonly CardHash[];
  readonly hashComparison: HashComparison | undefined;
}

export interface HashComparison {
  readonly comparedTo: string;
  readonly pass: boolean;
  readonly cards: readonly {
    readonly path: string;
    readonly build1: string | undefined;
    readonly build2: string;
    readonly pass: boolean;
  }[];
}

export interface ProbeOptions {
  readonly outDir: string;
  readonly siteUrl: string;
  readonly expectation: SeoExpectation;
  readonly expectationPath: string;
  readonly outputDir: string;
  readonly comparePath?: string;
}

export interface PngHeader {
  readonly width: number;
  readonly height: number;
  readonly bytes: number;
  readonly sha256: string;
}

interface SchemaTypeDefinition {
  readonly supertypes: readonly string[];
}

interface SchemaPropertyDefinition {
  readonly domainIncludes: readonly string[];
  readonly rangeIncludes: readonly string[];
}

export interface SchemaVocabulary {
  readonly version: string;
  readonly sourceUrl: string;
  readonly types: Readonly<Record<string, SchemaTypeDefinition>>;
  readonly properties: Readonly<Record<string, SchemaPropertyDefinition>>;
}

export interface SetDifference {
  readonly missing: readonly string[];
  readonly extra: readonly string[];
  readonly pass: boolean;
}

export type EvidenceUrlKind = 'self' | 'sameAs' | 'codeRepository';

export interface EvidenceUrl {
  readonly value: string;
  readonly kind: EvidenceUrlKind;
  readonly source: string;
}

export interface UrlFinding {
  readonly value: string;
  readonly source: string;
  readonly reason: string;
}

interface UnfurlInternal {
  readonly view: UnfurlView;
  readonly checks: readonly CheckResult[];
}

interface RawHashFile {
  readonly schemaVersion: number;
  readonly cards?: readonly Partial<CardHash>[];
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const MAX_CARD_BYTES = 300 * 1024;
const ABSOLUTE_TAG_KEYS = new Set(['canonical', 'og:image', 'og:url', 'twitter:image']);
const FORBIDDEN_ROUTE_FRAGMENTS = ['/dev/engine', 'fixtures', 'fps-calibration'] as const;
const VOCAB_PATH = new URL('./schema-vocab.json', import.meta.url);

function check(name: string, pass: boolean, detail: string): CheckResult {
  return { name, pass, detail };
}

function step(stepName: SeoProbeStep, checks: readonly CheckResult[]): StepResult {
  return { step: stepName, pass: checks.every((item) => item.pass), checks };
}

function allStepsPass(steps: readonly StepResult[]): boolean {
  return steps.every((item) => item.pass);
}

function normalizeSiteUrl(value: string): string {
  return new URL(value).origin;
}

export function isAbsoluteHttpUrl(value: string | undefined): boolean {
  if (!value) return false;

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function tagIdentity(tag: ExpectedTag): string {
  if (tag.tag === 'title') return 'title';
  if (tag.tag === 'link') return tag.key ?? tag.attribute ?? 'link';
  return tag.key ?? tag.attribute ?? 'meta';
}

function matchingElements(head: ParentNode, tag: ExpectedTag): Element[] {
  if (tag.tag === 'title') return [...head.querySelectorAll('title')];

  if (tag.tag === 'meta') {
    return [...head.querySelectorAll('meta')].filter(
      (element) => tag.key !== undefined && element.getAttribute(tag.attribute ?? '') === tag.key,
    );
  }

  return [...head.querySelectorAll('link')].filter((element) =>
    (element.getAttribute('rel') ?? '').split(/\s+/).includes(tag.key ?? ''),
  );
}

function tagValue(element: Element, tag: ExpectedTag): string | null {
  if (tag.tag === 'title') return element.textContent;
  if (tag.tag === 'meta') return element.getAttribute('content');
  return element.getAttribute('href');
}

export function evaluateMetaTags(
  head: ParentNode,
  tags: readonly ExpectedTag[],
): readonly CheckResult[] {
  const checks: CheckResult[] = [];

  for (const expected of tags) {
    const identity = tagIdentity(expected);
    const elements = matchingElements(head, expected);
    const only = elements.length === 1 ? elements[0] : undefined;
    const actual = only === undefined ? null : tagValue(only, expected);
    const present = elements.length === 1 && actual !== null && actual.trim() !== '';
    const exact = present && actual === expected.value;
    const absolute = !ABSOLUTE_TAG_KEYS.has(identity) || isAbsoluteHttpUrl(actual ?? undefined);

    checks.push(
      check(
        `${identity} is present once in <head>`,
        elements.length === 1 && present,
        elements.length === 1 ? `value=${JSON.stringify(actual)}` : `matches=${elements.length}`,
      ),
      check(
        `${identity} exactly equals the generated expectation`,
        exact,
        `expected=${JSON.stringify(expected.value)} actual=${JSON.stringify(actual)}`,
      ),
    );

    if (ABSOLUTE_TAG_KEYS.has(identity)) {
      checks.push(
        check(
          `${identity} is an absolute HTTP(S) URL`,
          absolute,
          `value=${JSON.stringify(actual)}`,
        ),
      );
    }
  }

  return checks;
}

export function evaluateEveryPage(
  head: ParentNode,
  expectation: SeoExpectation['everyPage'],
): readonly CheckResult[] {
  const checks: CheckResult[] = [];

  for (const expected of expectation.links) {
    const elements = [...head.querySelectorAll('link')].filter((element) =>
      (element.getAttribute('rel') ?? '').split(/\s+/).includes(expected.rel),
    );
    const actual = elements.length === 1 ? elements[0] : undefined;
    const typeMatches =
      expected.type === undefined || actual?.getAttribute('type') === expected.type;
    const hrefMatches = actual?.getAttribute('href') === expected.href;

    checks.push(
      check(
        `${expected.rel} link is present once in <head>`,
        elements.length === 1,
        `matches=${elements.length}`,
      ),
      check(
        `${expected.rel} link exactly equals the generated expectation`,
        elements.length === 1 && hrefMatches && typeMatches,
        `expected=${JSON.stringify(expected)} actual=${JSON.stringify(actual?.outerHTML)}`,
      ),
    );
  }

  for (const expected of expectation.themeColors) {
    const elements = [...head.querySelectorAll('meta[name="theme-color"]')].filter(
      (element) => element.getAttribute('media') === expected.media,
    );
    const actual = elements.length === 1 ? elements[0]?.getAttribute('content') : undefined;

    checks.push(
      check(
        `theme-color ${expected.media} is present once in <head>`,
        elements.length === 1,
        `matches=${elements.length}`,
      ),
      check(
        `theme-color ${expected.media} exactly equals the generated expectation`,
        actual === expected.content,
        `expected=${JSON.stringify(expected.content)} actual=${JSON.stringify(actual)}`,
      ),
    );
  }

  return checks;
}

function htmlCandidates(outDir: string, routePath: string): string[] {
  if (routePath === '/') return [join(outDir, 'index.html')];

  const rooted = routePath.replace(/^\/+|\/+$/g, '');
  return [join(outDir, `${rooted}.html`), join(outDir, rooted, 'index.html')];
}

async function isFile(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

async function findHtml(outDir: string, routePath: string): Promise<string | undefined> {
  for (const candidate of htmlCandidates(outDir, routePath)) {
    if (await isFile(candidate)) return candidate;
  }

  return undefined;
}

async function listHtmlFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await listHtmlFiles(path)));
    if (entry.isFile() && entry.name.endsWith('.html')) files.push(path);
  }

  return files.sort();
}

function routePathForHtml(outDir: string, htmlPath: string): string {
  const path = relative(outDir, htmlPath).split(sep).join('/');
  if (path === 'index.html') return '/';
  if (path === '404.html' || path === '_not-found.html') return `/${path.replace(/\.html$/, '')}`;

  return `/${path.replace(/\.html$/, '')}`;
}

function readDocument(html: string): Document {
  return new JSDOM(html).window.document;
}

function jsonLdDocuments(document: Document): unknown[] {
  return [...document.querySelectorAll('script[type="application/ld+json"]')].map((script) => {
    const raw = script.textContent ?? '';

    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return { invalidJson: raw };
    }
  });
}

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function typeNames(value: unknown): readonly string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  return [];
}

function vocabularyClosure(vocabulary: SchemaVocabulary, typeName: string): Set<string> {
  const closure = new Set<string>();
  const pending = [typeName];

  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined || closure.has(current)) continue;
    closure.add(current);
    const definition = vocabulary.types[current];
    if (definition !== undefined) pending.push(...definition.supertypes);
  }

  return closure;
}

function typeSatisfiesRanges(
  vocabulary: SchemaVocabulary,
  actualType: string,
  ranges: readonly string[],
): boolean {
  const actualClosure = vocabularyClosure(vocabulary, actualType);
  return ranges.some((range) => {
    if (vocabulary.types[range] === undefined) return false;
    return vocabularyClosure(vocabulary, range).has(actualType) || actualClosure.has(range);
  });
}

function validateSchemaNode(
  node: Record<string, unknown>,
  vocabulary: SchemaVocabulary,
  path: string,
): CheckResult[] {
  const checks: CheckResult[] = [];
  const types = typeNames(node['@type']);

  checks.push(
    check(`${path} has at least one @type`, types.length > 0, `types=${JSON.stringify(types)}`),
  );

  for (const typeName of types) {
    checks.push(
      check(
        `${path} @type ${typeName} exists in schema.org ${vocabulary.version}`,
        vocabulary.types[typeName] !== undefined,
        `known=${Object.keys(vocabulary.types).join(',')}`,
      ),
    );
  }

  const closures = types.map((typeName) => vocabularyClosure(vocabulary, typeName));

  for (const [propertyName, propertyValue] of Object.entries(node)) {
    if (propertyName.startsWith('@')) continue;

    const definition = vocabulary.properties[propertyName];
    checks.push(
      check(
        `${path}.${propertyName} exists in the schema vocabulary subset`,
        definition !== undefined,
        `property=${propertyName}`,
      ),
    );
    if (definition === undefined) continue;

    const domainPass = closures.some((closure) =>
      definition.domainIncludes.some((domain) => closure.has(domain)),
    );
    checks.push(
      check(
        `${path}.${propertyName} is valid for its @type`,
        domainPass,
        `types=${JSON.stringify(types)} domains=${JSON.stringify(definition.domainIncludes)}`,
      ),
    );

    const values = Array.isArray(propertyValue) ? propertyValue : [propertyValue];
    for (const [index, value] of values.entries()) {
      const child = record(value);
      const childType = child === undefined ? undefined : typeNames(child['@type'])[0];
      const rangePass =
        childType !== undefined
          ? typeSatisfiesRanges(vocabulary, childType, definition.rangeIncludes)
          : typeof value === 'string' &&
            (definition.rangeIncludes.includes('Text') || definition.rangeIncludes.includes('URL'));

      checks.push(
        check(
          `${path}.${propertyName}[${index}] is in the expected range`,
          rangePass,
          `value=${JSON.stringify(value)} ranges=${JSON.stringify(definition.rangeIncludes)}`,
        ),
      );

      if (child !== undefined) {
        checks.push(...validateSchemaNode(child, vocabulary, `${path}.${propertyName}[${index}]`));
      }
    }
  }

  return checks;
}

export function validateSchemaVocabulary(
  document: unknown,
  vocabulary: SchemaVocabulary,
): readonly CheckResult[] {
  const root = record(document);
  if (root === undefined) return [check('JSON-LD root is an object', false, typeof document)];

  const checks: CheckResult[] = [];
  checks.push(
    check(
      'JSON-LD @context is https://schema.org',
      root['@context'] === 'https://schema.org',
      `@context=${JSON.stringify(root['@context'])}`,
    ),
  );
  checks.push(...validateSchemaNode(root, vocabulary, '$'));
  return checks;
}

function stringLeaves(value: unknown, path: string[] = []): { path: string[]; value: string }[] {
  if (typeof value === 'string') return [{ path, value }];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => stringLeaves(item, [...path, String(index)]));
  }

  const object = record(value);
  if (object === undefined) return [];
  return Object.entries(object).flatMap(([key, child]) => stringLeaves(child, [...path, key]));
}

export function compareUrlSets(
  actual: readonly string[],
  expected: readonly string[],
): SetDifference {
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);
  const missing = [...expectedSet].filter((value) => !actualSet.has(value)).sort();
  const extra = [...actualSet].filter((value) => !expectedSet.has(value)).sort();

  return { missing, extra, pass: missing.length === 0 && extra.length === 0 };
}

function expectedContentUrls(jsonLd: unknown): Set<string> {
  return new Set(
    stringLeaves(jsonLd)
      .filter((leaf) => leaf.path.some((part) => part === 'sameAs' || part === 'codeRepository'))
      .map((leaf) => leaf.value),
  );
}

function isPreviewHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.vercel.app');
}

export function classifyUrlEvidence(
  evidence: readonly EvidenceUrl[],
  siteUrl: string,
  expectedContentUrlSet: ReadonlySet<string>,
): readonly UrlFinding[] {
  const site = new URL(siteUrl);
  const findings: UrlFinding[] = [];

  for (const item of evidence) {
    let url: URL;
    try {
      url = item.kind === 'self' ? new URL(item.value, siteUrl) : new URL(item.value);
    } catch {
      findings.push({ value: item.value, source: item.source, reason: 'URL is not absolute' });
      continue;
    }

    if (isPreviewHost(url.hostname) && !isPreviewHost(site.hostname)) {
      findings.push({
        value: item.value,
        source: item.source,
        reason: `blacklisted host ${url.hostname}`,
      });
    }

    if (item.kind === 'self') {
      if (url.origin !== site.origin) {
        findings.push({
          value: item.value,
          source: item.source,
          reason: `self URL origin ${url.origin} != ${site.origin}`,
        });
      }
      continue;
    }

    if (!expectedContentUrlSet.has(item.value)) {
      findings.push({
        value: item.value,
        source: item.source,
        reason: `${item.kind} is not a verbatim content URL`,
      });
    }
  }

  return findings;
}

function documentUrlEvidence(document: Document, jsonLd: readonly unknown[]): EvidenceUrl[] {
  const evidence: EvidenceUrl[] = [];

  for (const link of document.querySelectorAll('link[rel="canonical"]')) {
    const value = link.getAttribute('href');
    if (value) evidence.push({ value, kind: 'self', source: 'canonical' });
  }

  for (const meta of document.querySelectorAll('meta[property^="og:"], meta[name^="twitter:"]')) {
    const value = meta.getAttribute('content');
    if (!value || !isAbsoluteHttpUrl(value)) continue;
    const key = meta.getAttribute('property') ?? meta.getAttribute('name') ?? 'meta';
    evidence.push({ value, kind: 'self', source: key });
  }

  for (const link of document.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]')) {
    const value = link.getAttribute('href');
    if (value) {
      evidence.push({ value, kind: 'self', source: `link:${link.getAttribute('rel') ?? ''}` });
    }
  }

  for (const documentValue of jsonLd) {
    for (const leaf of stringLeaves(documentValue)) {
      if (leaf.path.some((part) => part.startsWith('@'))) continue;
      if (!isAbsoluteHttpUrl(leaf.value)) continue;
      const source = leaf.path.join('.');
      const contentProperty = leaf.path.find(
        (part) => part === 'sameAs' || part === 'codeRepository',
      );
      evidence.push({
        value: leaf.value,
        kind:
          contentProperty === 'sameAs'
            ? 'sameAs'
            : contentProperty === 'codeRepository'
              ? 'codeRepository'
              : 'self',
        source,
      });
    }
  }

  return evidence;
}

function hostLeakStep(
  document: Document,
  jsonLd: readonly unknown[],
  expectedJsonLd: unknown,
  siteUrl: string,
): StepResult {
  const expected = expectedContentUrls(expectedJsonLd);
  const evidence = documentUrlEvidence(document, jsonLd);
  const findings = classifyUrlEvidence(evidence, siteUrl, expected);

  return step('host-leak', [
    check(
      'every self URL uses the configured origin and all content URLs are verbatim',
      findings.length === 0,
      findings.length === 0 ? `${evidence.length} URL values checked` : JSON.stringify(findings),
    ),
  ]);
}

function findScriptJsonLd(document: Document): {
  value: unknown | undefined;
  error: string | undefined;
} {
  const scripts = jsonLdDocuments(document);
  if (scripts.length !== 1) {
    return { value: undefined, error: `expected one JSON-LD script, found ${scripts.length}` };
  }

  const invalid = record(scripts[0])?.['invalidJson'];
  if (typeof invalid === 'string') return { value: undefined, error: 'JSON-LD is not valid JSON' };
  return { value: scripts[0], error: undefined };
}

function jsonLdStep(
  document: Document,
  expected: ExpectedRoute,
  expectedJsonLd: Record<string, unknown> | undefined,
  canonical: string,
  vocabulary: SchemaVocabulary,
): StepResult {
  const parsed = findScriptJsonLd(document);
  if (expectedJsonLd === undefined) {
    return step('json-ld', [
      check(
        'route has no JSON-LD document by design',
        parsed.value === undefined && parsed.error === 'expected one JSON-LD script, found 0',
        parsed.error ?? 'unexpected JSON-LD document',
      ),
    ]);
  }

  const checks: CheckResult[] = [
    check('JSON-LD script parses', parsed.error === undefined, parsed.error ?? 'valid JSON'),
  ];

  if (parsed.value === undefined) return step('json-ld', checks);

  checks.push(
    check(
      'JSON-LD exactly matches the content-derived expectation',
      JSON.stringify(parsed.value) === JSON.stringify(expectedJsonLd),
      `expected=${JSON.stringify(expectedJsonLd)} actual=${JSON.stringify(parsed.value)}`,
    ),
  );
  checks.push(...validateSchemaVocabulary(parsed.value, vocabulary));

  const root = record(parsed.value);
  checks.push(
    check(
      'JSON-LD url equals the page canonical',
      root?.['url'] === canonical,
      `expected=${canonical} actual=${JSON.stringify(root?.['url'])}`,
    ),
  );

  const author = record(root?.['author']);
  if (author !== undefined) {
    const expectedAuthor = record(expectedJsonLd['author']);
    const expectedAuthorUrl = expectedAuthor?.['url'];
    checks.push(
      check(
        'JSON-LD author.url equals the page canonical origin home',
        author['url'] === expectedAuthorUrl,
        `expected=${JSON.stringify(expectedAuthorUrl)} actual=${JSON.stringify(author['url'])}`,
      ),
    );
  }

  return step('json-ld', checks);
}

export function parsePngIhdr(bytes: Uint8Array): PngHeader | undefined {
  if (bytes.length < 24) return undefined;
  if (!PNG_SIGNATURE.equals(Buffer.from(bytes.subarray(0, PNG_SIGNATURE.length)))) return undefined;
  if (Buffer.from(bytes.subarray(12, 16)).toString('ascii') !== 'IHDR') return undefined;

  const view = Buffer.from(bytes);
  const width = view.readUInt32BE(16);
  const height = view.readUInt32BE(20);
  if (width === 0 || height === 0) return undefined;

  return {
    width,
    height,
    bytes: bytes.byteLength,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
}

async function evaluateCard(
  outDir: string,
  route: ExpectedRoute,
  document: Document,
  comparison: ReadonlyMap<string, string> | undefined,
): Promise<{ result: StepResult; hash: CardHash | undefined }> {
  const imagePath = join(outDir, `.${route.ogImagePath}`);
  const checks: CheckResult[] = [];

  try {
    const bytes = await readFile(imagePath);
    const header = parsePngIhdr(bytes);
    checks.push(
      check('card file exists', true, route.ogImagePath),
      check(
        'card is a PNG with a valid IHDR chunk',
        header !== undefined,
        header === undefined ? 'signature or IHDR invalid' : `sha256=${header.sha256}`,
      ),
    );

    if (header === undefined) return { result: step('card', checks), hash: undefined };

    checks.push(
      check(
        'card is exactly 1200x630',
        header.width === 1200 && header.height === 630,
        `${header.width}x${header.height}`,
      ),
      check(
        'card is at most 300 KiB',
        header.bytes <= MAX_CARD_BYTES,
        `${header.bytes} bytes (limit ${MAX_CARD_BYTES})`,
      ),
    );

    const imageMeta = [...document.querySelectorAll('meta[property="og:image"]')]
      .map((element) => element.getAttribute('content'))
      .find((value): value is string => value !== null);
    const imageUrl = imageMeta === undefined ? undefined : new URL(imageMeta, route.canonical);
    checks.push(
      check(
        'og:image resolves to the checked card file',
        imageUrl?.origin === new URL(route.canonical).origin &&
          imageUrl.pathname === route.ogImagePath,
        `og:image=${JSON.stringify(imageMeta)} card=${route.ogImagePath}`,
      ),
    );

    if (comparison !== undefined) {
      const previous = comparison.get(route.ogImagePath);
      checks.push(
        check(
          'card hash equals the first build',
          previous === header.sha256,
          `build-1=${JSON.stringify(previous)} build-2=${header.sha256}`,
        ),
      );
    }

    return {
      result: step('card', checks),
      hash: {
        route: route.path,
        path: route.ogImagePath,
        bytes: header.bytes,
        sha256: header.sha256,
      },
    };
  } catch (error) {
    checks.push(
      check('card file exists', false, error instanceof Error ? error.message : String(error)),
    );
    return { result: step('card', checks), hash: undefined };
  }
}

export async function readSeoExpectation(path: string): Promise<SeoExpectation> {
  const parsed = JSON.parse(await readFile(path, 'utf8')) as Partial<SeoExpectation>;
  if (
    parsed.schemaVersion !== 1 ||
    typeof parsed.siteUrl !== 'string' ||
    !Array.isArray(parsed.routes) ||
    record(parsed.everyPage) === undefined
  ) {
    throw new Error(`invalid SEO expectation file: ${path}`);
  }

  return parsed as SeoExpectation;
}

async function readComparison(
  path: string,
): Promise<{ path: string; hashes: Map<string, string> }> {
  const parsed = JSON.parse(await readFile(path, 'utf8')) as RawHashFile;
  const hashes = new Map<string, string>();

  for (const card of parsed.cards ?? []) {
    if (typeof card.path === 'string' && typeof card.sha256 === 'string') {
      hashes.set(card.path, card.sha256);
    }
  }

  return { path, hashes };
}

async function evaluateUnfurl(document: Document, route: ExpectedRoute): Promise<UnfurlInternal> {
  const expected = new Map(
    route.tags
      .filter((tag): tag is ExpectedTag & { key: string } => tag.key !== undefined)
      .map((tag) => [tagIdentity(tag), tag.value]),
  );

  try {
    const { result, error } = await ogs({ html: document.documentElement.outerHTML });
    const image = result.ogImage?.[0];
    const checks: CheckResult[] = [
      check('open-graph-scraper parsed the HTML', error === false, `error=${String(error)}`),
      check(
        'unfurler title matches og:title',
        result.ogTitle === expected.get('og:title'),
        `expected=${JSON.stringify(expected.get('og:title'))} actual=${JSON.stringify(result.ogTitle)}`,
      ),
      check(
        'unfurler description matches og:description',
        result.ogDescription === expected.get('og:description'),
        `expected=${JSON.stringify(expected.get('og:description'))} actual=${JSON.stringify(result.ogDescription)}`,
      ),
      check(
        'unfurler image URL matches og:image',
        image?.url === expected.get('og:image'),
        `expected=${JSON.stringify(expected.get('og:image'))} actual=${JSON.stringify(image?.url)}`,
      ),
      check(
        'unfurler image width matches og:image:width',
        image?.width !== undefined && String(image.width) === expected.get('og:image:width'),
        `expected=${JSON.stringify(expected.get('og:image:width'))} actual=${JSON.stringify(image?.width)}`,
      ),
      check(
        'unfurler image height matches og:image:height',
        image?.height !== undefined && String(image.height) === expected.get('og:image:height'),
        `expected=${JSON.stringify(expected.get('og:image:height'))} actual=${JSON.stringify(image?.height)}`,
      ),
      check(
        'unfurler card matches twitter:card',
        result.twitterCard === expected.get('twitter:card'),
        `expected=${JSON.stringify(expected.get('twitter:card'))} actual=${JSON.stringify(result.twitterCard)}`,
      ),
    ];

    return {
      view: {
        route: route.path,
        title: result.ogTitle,
        description: result.ogDescription,
        image: image?.url,
        width: image?.width,
        height: image?.height,
        card: result.twitterCard,
        pass: checks.every((item) => item.pass),
        error: undefined,
      },
      checks,
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return {
      view: {
        route: route.path,
        title: undefined,
        description: undefined,
        image: undefined,
        width: undefined,
        height: undefined,
        card: undefined,
        pass: false,
        error: detail,
      },
      checks: [check('open-graph-scraper parsed the HTML', false, detail)],
    };
  }
}

async function evaluateSitemapRobots(
  outDir: string,
  siteUrl: string,
  routes: readonly ExpectedRoute[],
): Promise<StepResult> {
  const checks: CheckResult[] = [];

  try {
    const sitemapText = await readFile(join(outDir, 'sitemap.xml'), 'utf8');
    const robotsText = await readFile(join(outDir, 'robots.txt'), 'utf8');
    const sitemap = new JSDOM(sitemapText, { contentType: 'text/xml' }).window.document;
    const locations = [...sitemap.querySelectorAll('loc')].map(
      (loc) => loc.textContent?.trim() ?? '',
    );
    const expected = routes.map((route) => route.canonical);
    const difference = compareUrlSets(locations, expected);
    const requiredRobots = ['Allow: /', 'Disallow: /dev/', `Sitemap: ${siteUrl}/sitemap.xml`];
    const robotsLines = new Set(robotsText.split(/\r?\n/u).map((line) => line.trim()));
    const forbidden = FORBIDDEN_ROUTE_FRAGMENTS.filter(
      (fragment) => sitemapText.includes(fragment) || robotsText.includes(fragment),
    );

    checks.push(
      check('sitemap.xml exists and contains <loc> entries', true, `${locations.length} entries`),
      check(
        'sitemap URL set exactly equals the indexable routes',
        difference.pass,
        `missing=${JSON.stringify(difference.missing)} extra=${JSON.stringify(difference.extra)}`,
      ),
      ...requiredRobots.map((line) =>
        check(
          `robots.txt contains ${JSON.stringify(line)}`,
          robotsLines.has(line),
          `lines=${JSON.stringify([...robotsLines])}`,
        ),
      ),
      check(
        'sitemap and robots exclude dev, fixture and calibration routes',
        forbidden.length === 0,
        `found=${JSON.stringify(forbidden)}`,
      ),
    );
  } catch (error) {
    checks.push(
      check(
        'sitemap.xml and robots.txt exist and parse',
        false,
        error instanceof Error ? error.message : String(error),
      ),
    );
  }

  return step('sitemap-robots', checks);
}

function renderFailureTable(routes: readonly RouteProbe[]): string[] {
  const rows: string[] = [];
  for (const route of routes) {
    for (const item of route.steps) {
      for (const failed of item.checks.filter((candidate) => !candidate.pass)) {
        rows.push(`| ${route.path} | ${item.step} | ${failed.name} | ${failed.detail} |`);
      }
    }
  }

  return rows;
}

function renderSummary(report: SeoProbeReport): string {
  const routeRows = report.routes.map((route) => {
    const cells = SEO_PROBE_STEPS.map((name) => {
      const result = route.steps.find((candidate) => candidate.step === name);
      return result?.pass === true ? 'PASS' : 'FAIL';
    });
    return `| ${route.path} | ${cells.join(' | ')} | ${route.pass ? 'PASS' : 'FAIL'} |`;
  });
  const unfurlRows = report.unfurl.map(
    (view) =>
      `| ${view.route} | ${view.title ?? ''} | ${view.description ?? ''} | ${view.image ?? ''} | ${view.width ?? ''}x${view.height ?? ''} | ${view.card ?? ''} | ${view.pass ? 'PASS' : 'FAIL'} |`,
  );
  const cardRows = report.cards.map(
    (card) => `| ${card.route} | ${card.path} | ${card.bytes} | ${card.sha256} |`,
  );
  const comparisonRows =
    report.hashComparison?.cards.map(
      (card) =>
        `| ${card.path} | ${card.build1 ?? ''} | ${card.build2} | ${card.pass ? 'PASS' : 'FAIL'} |`,
    ) ?? [];
  const coverageRows = report.htmlCoverage.map(
    (coverage) =>
      `| ${coverage.htmlPath} | ${coverage.routePath} | ${coverage.checks.filter((item) => item.pass).length}/${coverage.checks.length} | ${coverage.pass ? 'PASS' : 'FAIL'} |`,
  );
  const failures = renderFailureTable(report.routes);

  return [
    '# SEO probe',
    '',
    `Site URL: ${report.siteUrl}`,
    `Export: ${report.outDir}`,
    `Expectation: ${report.expectationPath}`,
    `Result: ${report.result}`,
    '',
    '## Per-route steps',
    '',
    '| Route | 1 meta | 2 unfurl | 3 card | 4 sitemap | 5 JSON-LD | 6 hosts | Result |',
    '|---|---|---|---|---|---|---|---|',
    ...routeRows,
    '',
    '## Unfurl view',
    '',
    '| Route | Title | Description | Image | Dimensions | Card | Result |',
    '|---|---|---|---|---|---|---|',
    ...unfurlRows,
    '',
    '## Cards and SHA-256',
    '',
    '| Route | Image | Bytes | SHA-256 |',
    '|---|---|---:|---|',
    ...cardRows,
    '',
    '## Build comparison',
    '',
    report.hashComparison === undefined
      ? 'First build; no comparison requested.'
      : `Compared with ${report.hashComparison.comparedTo}: ${report.hashComparison.pass ? 'PASS' : 'FAIL'}`,
    '',
    ...(report.hashComparison === undefined
      ? []
      : ['| Image | Build 1 | Build 2 | Result |', '|---|---|---|---|', ...comparisonRows, '']),
    '## Every HTML file',
    '',
    '| HTML | Route | Checks | Result |',
    '|---|---|---:|---|',
    ...coverageRows,
    '',
    '## Failures',
    '',
    ...(failures.length === 0
      ? ['None.']
      : ['| Route | Step | Check | Detail |', '|---|---|---|---|', ...failures]),
    '',
  ].join('\n');
}

async function writeArtifacts(
  outputDir: string,
  report: SeoProbeReport,
  hashes: readonly CardHash[],
): Promise<void> {
  await mkdir(outputDir, { recursive: true });
  await Promise.all([
    writeFile(join(outputDir, 'seo-probe.json'), `${JSON.stringify(report, null, 2)}\n`),
    writeFile(
      join(outputDir, 'og-hashes.json'),
      `${JSON.stringify({ schemaVersion: 1, siteUrl: report.siteUrl, cards: hashes }, null, 2)}\n`,
    ),
    writeFile(join(outputDir, 'summary.md'), renderSummary(report)),
  ]);
}

export async function runSeoProbe(options: ProbeOptions): Promise<SeoProbeReport> {
  const outDir = resolve(options.outDir);
  const siteUrl = normalizeSiteUrl(options.siteUrl);
  const comparison =
    options.comparePath === undefined
      ? undefined
      : await readComparison(resolve(options.comparePath));
  const vocabulary = JSON.parse(await readFile(VOCAB_PATH, 'utf8')) as SchemaVocabulary;
  const routes: RouteProbe[] = [];
  const unfurl: UnfurlView[] = [];
  const cards: CardHash[] = [];
  const coverage: HtmlCoverage[] = [];

  const sitemapRobots = await evaluateSitemapRobots(outDir, siteUrl, options.expectation.routes);

  for (const route of options.expectation.routes) {
    const htmlPath = await findHtml(outDir, route.path);
    if (htmlPath === undefined) {
      const missing = step('meta', [
        check('route HTML exists', false, `no export file for ${route.path}`),
      ]);
      routes.push({
        path: route.path,
        kind: route.kind,
        htmlPath: '(missing)',
        pass: false,
        steps: [missing],
      });
      continue;
    }

    const html = await readFile(htmlPath, 'utf8');
    const document = readDocument(html);
    const metaChecks = [
      ...evaluateMetaTags(document.head, route.tags),
      ...evaluateEveryPage(document.head, options.expectation.everyPage),
    ];
    const metaStep = step('meta', metaChecks);
    const unfurlResult = await evaluateUnfurl(document, route);
    const cardResult = await evaluateCard(outDir, route, document, comparison?.hashes);
    const parsedJsonLd = findScriptJsonLd(document);
    const jsonLdResult = jsonLdStep(document, route, route.jsonLd, route.canonical, vocabulary);
    const hostLeak = hostLeakStep(
      document,
      parsedJsonLd.value === undefined ? [] : [parsedJsonLd.value],
      route.jsonLd ?? {},
      siteUrl,
    );
    const steps = [
      metaStep,
      step('unfurl', unfurlResult.checks),
      cardResult.result,
      sitemapRobots,
      jsonLdResult,
      hostLeak,
    ];

    routes.push({
      path: route.path,
      kind: route.kind,
      htmlPath,
      pass: allStepsPass(steps),
      steps,
    });
    unfurl.push(unfurlResult.view);
    if (cardResult.hash !== undefined) cards.push(cardResult.hash);
  }

  const htmlFiles = await listHtmlFiles(outDir);
  for (const htmlPath of htmlFiles) {
    const html = await readFile(htmlPath, 'utf8');
    const document = readDocument(html);
    const jsonLd = jsonLdDocuments(document);
    const routePath = routePathForHtml(outDir, htmlPath);
    const expectedRoute = options.expectation.routes.find((route) => route.path === routePath);
    const checked = [
      ...evaluateEveryPage(document.head, options.expectation.everyPage),
      ...hostLeakStep(document, jsonLd, expectedRoute?.jsonLd ?? {}, siteUrl).checks,
    ];
    coverage.push({
      htmlPath,
      routePath,
      pass: checked.every((item) => item.pass),
      checks: checked,
    });
  }

  const comparedCards =
    comparison === undefined
      ? undefined
      : cards.map((card) => ({
          path: card.path,
          build1: comparison.hashes.get(card.path),
          build2: card.sha256,
          pass: comparison.hashes.get(card.path) === card.sha256,
        }));
  const resolvedComparison: HashComparison | undefined =
    comparison === undefined || comparedCards === undefined
      ? undefined
      : {
          comparedTo: comparison.path,
          pass:
            comparedCards.length === comparison.hashes.size &&
            comparedCards.every((card) => card.pass),
          cards: comparedCards,
        };

  const routePass = routes.every((route) => route.pass);
  const coveragePass = coverage.every((item) => item.pass) && coverage.length > 0;
  const cardPass = cards.length === options.expectation.routes.length;
  const comparisonPass = resolvedComparison?.pass ?? true;
  const report: SeoProbeReport = {
    schemaVersion: 1,
    result: routePass && coveragePass && cardPass && comparisonPass ? 'PASS' : 'FAIL',
    siteUrl,
    outDir,
    expectationPath: options.expectationPath,
    routes,
    htmlCoverage: coverage,
    sitemapRobots,
    unfurl,
    cards,
    hashComparison: resolvedComparison,
  };

  await writeArtifacts(options.outputDir, report, cards);
  return report;
}
