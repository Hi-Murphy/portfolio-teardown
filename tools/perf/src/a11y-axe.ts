import { createRequire } from 'node:module';

import type { Page } from 'playwright';

import { CliError, EXIT } from './exit-codes.ts';

export const AXE_TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22aa',
  'best-practice',
] as const;

export type AxeImpact = 'minor' | 'moderate' | 'serious' | 'critical' | null;
export type AxeTarget = readonly (string | readonly string[])[];

export interface AxeCheckResult {
  readonly id: string;
  readonly message?: string;
  readonly data?: unknown;
}

export interface AxeNodeResult {
  readonly target: AxeTarget;
  readonly impact?: AxeImpact;
  readonly html?: string;
  readonly failureSummary?: string;
  readonly any?: readonly AxeCheckResult[];
  readonly all?: readonly AxeCheckResult[];
  readonly none?: readonly AxeCheckResult[];
}

export interface AxeRuleResult {
  readonly id: string;
  readonly impact?: AxeImpact;
  readonly description?: string;
  readonly help?: string;
  readonly helpUrl?: string;
  readonly tags?: readonly string[];
  readonly nodes: readonly AxeNodeResult[];
}

export interface AxeScanResults {
  readonly violations: readonly AxeRuleResult[];
  readonly incomplete: readonly AxeRuleResult[];
}

export interface DimLedgerSource {
  readonly selector: string;
  readonly layer: string;
  readonly opacity: number;
}

export interface ContrastLedgerEntry {
  readonly selector: string;
  readonly ratio: number | null;
  readonly layer: string;
  readonly opacity: number;
}

export interface AxeVerdictCounts {
  serious: number;
  critical: number;
  moderate: number;
  minor: number;
  incomplete: number;
}

export interface AxeVerdict {
  readonly failing: readonly AxeRuleResult[];
  readonly ledger: readonly ContrastLedgerEntry[];
  readonly incomplete: readonly AxeRuleResult[];
  readonly counts: AxeVerdictCounts;
  readonly exitCode: number;
}

export interface AxeVerdictOptions {
  readonly dimLedger?: readonly DimLedgerSource[];
}

export interface RunAxeOptions {
  readonly tags?: readonly string[];
}

export function parseAxeSelection(
  raw: string | undefined,
  ids: readonly string[],
): readonly string[] {
  if (raw === undefined || raw === 'all') return ids;

  const requested = raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  if (requested.length === 0) throw new CliError(EXIT.USAGE, '--states must not be empty');

  const unknown = requested.filter((id) => !ids.includes(id));
  if (unknown.length > 0) {
    throw new CliError(EXIT.USAGE, `unknown state: ${unknown.join(', ')}`);
  }

  return [...new Set(requested)];
}

interface BrowserAxe {
  run(
    context: Document,
    options: {
      runOnly: { type: 'tag'; values: readonly string[] };
      resultTypes: readonly string[];
    },
  ): Promise<AxeScanResults>;
}

interface AxeWindow extends Window {
  axe?: BrowserAxe;
}

const requireAxe = createRequire(import.meta.url);
let axeSource: string | undefined;

function source(): string {
  axeSource ??= (requireAxe('axe-core') as { source: string }).source;
  return axeSource;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function impact(value: unknown): AxeImpact | undefined {
  return value === null ||
    value === 'minor' ||
    value === 'moderate' ||
    value === 'serious' ||
    value === 'critical'
    ? value
    : undefined;
}

function strings(value: unknown): readonly string[] | undefined {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
    ? value
    : undefined;
}

function target(value: unknown): AxeTarget {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) =>
    typeof entry === 'string' ||
    (Array.isArray(entry) && entry.every((part) => typeof part === 'string'))
      ? [entry as string | readonly string[]]
      : [],
  );
}

function checks(value: unknown): readonly AxeCheckResult[] | undefined {
  if (!Array.isArray(value)) return undefined;

  return value.flatMap((entry) => {
    if (!isRecord(entry) || typeof entry.id !== 'string') return [];

    return [
      {
        id: entry.id,
        ...(typeof entry.message === 'string' ? { message: entry.message } : {}),
        ...('data' in entry ? { data: entry.data } : {}),
      },
    ];
  });
}

function node(value: unknown): AxeNodeResult | null {
  if (!isRecord(value)) return null;

  return {
    target: target(value.target),
    ...(impact(value.impact) === undefined ? {} : { impact: impact(value.impact) }),
    ...(typeof value.html === 'string' ? { html: value.html } : {}),
    ...(typeof value.failureSummary === 'string' ? { failureSummary: value.failureSummary } : {}),
    ...(checks(value.any) === undefined ? {} : { any: checks(value.any) }),
    ...(checks(value.all) === undefined ? {} : { all: checks(value.all) }),
    ...(checks(value.none) === undefined ? {} : { none: checks(value.none) }),
  };
}

function rule(value: unknown): AxeRuleResult | null {
  if (!isRecord(value) || typeof value.id !== 'string' || !Array.isArray(value.nodes)) return null;

  return {
    id: value.id,
    ...(impact(value.impact) === undefined ? {} : { impact: impact(value.impact) }),
    ...(typeof value.description === 'string' ? { description: value.description } : {}),
    ...(typeof value.help === 'string' ? { help: value.help } : {}),
    ...(typeof value.helpUrl === 'string' ? { helpUrl: value.helpUrl } : {}),
    ...(strings(value.tags) === undefined ? {} : { tags: strings(value.tags) }),
    nodes: value.nodes.flatMap((entry) => {
      const parsed = node(entry);
      return parsed === null ? [] : [parsed];
    }),
  };
}

function rules(value: unknown): readonly AxeRuleResult[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    const parsed = rule(entry);
    return parsed === null ? [] : [parsed];
  });
}

function trimResults(value: unknown): AxeScanResults {
  if (!isRecord(value)) {
    throw new CliError(EXIT.INTERNAL, 'axe returned an invalid result');
  }

  return {
    violations: rules(value.violations),
    incomplete: rules(value.incomplete),
  };
}

export function axeSelector(nodeResult: AxeNodeResult): string {
  const first = nodeResult.target[0];
  if (typeof first === 'string') return first;
  return first?.join(' >>> ') ?? '';
}

function contrastRatio(nodeResult: AxeNodeResult): number | null {
  for (const result of [
    ...(nodeResult.any ?? []),
    ...(nodeResult.all ?? []),
    ...(nodeResult.none ?? []),
  ]) {
    if (!isRecord(result.data)) continue;

    const ratio = result.data.contrastRatio;
    if (typeof ratio === 'number' && Number.isFinite(ratio)) return ratio;
  }

  return null;
}

function effectiveImpact(result: AxeRuleResult, nodeResult: AxeNodeResult): AxeImpact {
  return nodeResult.impact ?? result.impact ?? null;
}

export function axeVerdict(results: AxeScanResults, options: AxeVerdictOptions = {}): AxeVerdict {
  const dimmed = new Map(
    (options.dimLedger ?? []).map((entry) => [entry.selector, entry] as const),
  );
  const counts: AxeVerdictCounts = {
    serious: 0,
    critical: 0,
    moderate: 0,
    minor: 0,
    incomplete: 0,
  };
  const failing: AxeRuleResult[] = [];
  const incomplete: AxeRuleResult[] = [];
  const ledger: ContrastLedgerEntry[] = [];

  for (const result of results.violations) {
    const remaining: AxeNodeResult[] = [];

    for (const nodeResult of result.nodes) {
      const dim = result.id === 'color-contrast' ? dimmed.get(axeSelector(nodeResult)) : undefined;

      if (dim !== undefined) {
        ledger.push({
          selector: dim.selector,
          ratio: contrastRatio(nodeResult),
          layer: dim.layer,
          opacity: dim.opacity,
        });
        continue;
      }

      remaining.push(nodeResult);
      const nodeImpact = effectiveImpact(result, nodeResult);
      if (nodeImpact !== null) counts[nodeImpact] += 1;
    }

    if (
      remaining.some((nodeResult) => {
        const nodeImpact = effectiveImpact(result, nodeResult);
        return nodeImpact === 'serious' || nodeImpact === 'critical';
      })
    ) {
      failing.push({ ...result, nodes: remaining });
    }
  }

  for (const result of results.incomplete) {
    const remaining: AxeNodeResult[] = [];

    for (const nodeResult of result.nodes) {
      const dim = result.id === 'color-contrast' ? dimmed.get(axeSelector(nodeResult)) : undefined;

      if (dim !== undefined) {
        ledger.push({
          selector: dim.selector,
          ratio: contrastRatio(nodeResult),
          layer: dim.layer,
          opacity: dim.opacity,
        });
      } else {
        remaining.push(nodeResult);
      }
    }

    counts.incomplete += remaining.length;
    if (remaining.length > 0) incomplete.push({ ...result, nodes: remaining });
  }

  return {
    failing,
    ledger,
    incomplete,
    counts,
    exitCode: failing.length === 0 ? EXIT.OK : EXIT.BUDGET,
  };
}

export async function runAxe(page: Page, options: RunAxeOptions = {}): Promise<AxeScanResults> {
  await page.addScriptTag({ content: source() });

  const result = await page.evaluate(
    async ({ tags }) => {
      const axe = (window as AxeWindow).axe;
      if (axe === undefined) throw new Error('axe-core did not install on the page');

      return await axe.run(document, {
        runOnly: { type: 'tag', values: tags },
        resultTypes: ['violations', 'incomplete'],
      });
    },
    { tags: [...(options.tags ?? AXE_TAGS)] },
  );

  return trimResults(result);
}

export async function tagDimmedElements(page: Page): Promise<number> {
  return await page.evaluate(() => {
    const wrapper = document.querySelector('[data-xploder-ready="true"]');
    if (!(wrapper instanceof HTMLElement) || !wrapper.hasAttribute('data-xploder-focus')) return 0;

    let tagged = 0;
    for (const element of wrapper.querySelectorAll('*')) {
      let opacity = 1;
      let current: Element | null = element;

      while (current !== null && current !== wrapper.parentElement) {
        const value = Number.parseFloat(getComputedStyle(current).opacity);
        if (Number.isFinite(value)) opacity *= value;
        if (current === wrapper) break;
        current = current.parentElement;
      }

      if (opacity < 1) {
        element.setAttribute('data-a11y-dimmed', '');
        tagged += 1;
      }
    }

    return tagged;
  });
}

export async function readDimLedger(
  page: Page,
  results: AxeScanResults,
  componentLayers: Readonly<Record<string, string>>,
): Promise<readonly DimLedgerSource[]> {
  const selectors = [
    ...new Set(
      [...results.violations, ...results.incomplete]
        .filter((result) => result.id === 'color-contrast')
        .flatMap((result) => result.nodes.map((nodeResult) => axeSelector(nodeResult)))
        .filter((selector) => selector.length > 0),
    ),
  ];

  if (selectors.length === 0) return [];

  return await page.evaluate(
    ({ targets, layers }) => {
      function layerOf(element: Element): string {
        let current: Element | null = element;

        while (current !== null) {
          const layerLabel = current.getAttribute('data-xploder-lettering-layer-label');
          if (layerLabel !== null) return layerLabel;

          const label = current.getAttribute('data-xploder-label');
          if (label?.startsWith('layer:')) return label.slice('layer:'.length);
          if (label?.startsWith('part:')) {
            return layers[label.slice('part:'.length)] ?? 'unknown';
          }

          const lettering = current.getAttribute('data-xploder-lettering');
          if (lettering !== null) return layers[lettering] ?? 'unknown';

          current = current.parentElement;
        }

        return 'unknown';
      }

      function opacityOf(element: Element): number {
        const wrapper = element.closest('[data-xploder-ready="true"]');
        let opacity = 1;
        let current: Element | null = element;

        while (current !== null) {
          const value = Number.parseFloat(getComputedStyle(current).opacity);
          if (Number.isFinite(value)) opacity *= value;
          if (current === wrapper) break;
          current = current.parentElement;
        }

        return opacity;
      }

      return targets.flatMap((selector) => {
        let element: Element | null;
        try {
          element = document.querySelector(selector);
        } catch {
          return [];
        }

        if (element === null || !element.hasAttribute('data-a11y-dimmed')) return [];

        return [{ selector, layer: layerOf(element), opacity: opacityOf(element) }];
      });
    },
    { targets: selectors, layers: componentLayers },
  );
}
