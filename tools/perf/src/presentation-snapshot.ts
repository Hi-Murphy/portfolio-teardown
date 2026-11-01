import type { Page } from 'playwright';

export const PRESENTATION_LAYER_SELECTORS = [
  '[data-xploder-panel-layer]',
  '[data-xploder-lettering-layer]',
] as const;

export const PRESENTATION_STYLE_PROPERTIES = [
  'color',
  'background-color',
  'font-family',
  'font-size',
  'font-weight',
  'letter-spacing',
  'text-transform',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'border-top-width',
  'border-right-width',
  'border-bottom-width',
  'border-left-width',
  'opacity',
  'transform',
  'visibility',
  'display',
] as const;

export type PresentationStyleProperty = (typeof PRESENTATION_STYLE_PROPERTIES)[number];
export type PresentationStyles = Record<PresentationStyleProperty, string>;

export interface PresentationRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface PresentationEntry {
  readonly state: string;
  readonly path: string;
  readonly tag: string;
  readonly rect: PresentationRect;
  readonly styles: PresentationStyles;
}

export type PresentationSnapshot = readonly PresentationEntry[];

export interface PresentationDiffEntry {
  readonly state: string;
  readonly path: string;
  readonly kind: 'added' | 'removed' | 'changed';
  readonly property?: string;
  readonly before?: string | number;
  readonly after?: string | number;
}

function entryKey(entry: PresentationEntry): string {
  return `${entry.state}\u0000${entry.path}`;
}

function changed(
  entry: PresentationEntry,
  property: string,
  before: string | number,
  after: string | number,
): PresentationDiffEntry {
  return { state: entry.state, path: entry.path, kind: 'changed', property, before, after };
}

export function diffPresentation(
  before: PresentationSnapshot,
  after: PresentationSnapshot,
): PresentationDiffEntry[] {
  const beforeByKey = new Map(before.map((entry) => [entryKey(entry), entry]));
  const afterByKey = new Map(after.map((entry) => [entryKey(entry), entry]));
  const differences: PresentationDiffEntry[] = [];

  for (const entry of before) {
    const next = afterByKey.get(entryKey(entry));
    if (next === undefined) {
      differences.push({ state: entry.state, path: entry.path, kind: 'removed' });
      continue;
    }

    if (entry.tag !== next.tag) {
      differences.push(changed(entry, 'tag', entry.tag, next.tag));
    }

    for (const property of ['x', 'y', 'width', 'height'] as const) {
      if (entry.rect[property] !== next.rect[property]) {
        differences.push(
          changed(entry, `rect.${property}`, entry.rect[property], next.rect[property]),
        );
      }
    }

    for (const property of PRESENTATION_STYLE_PROPERTIES) {
      if (entry.styles[property] !== next.styles[property]) {
        differences.push(
          changed(entry, `styles.${property}`, entry.styles[property], next.styles[property]),
        );
      }
    }
  }

  for (const entry of after) {
    if (!beforeByKey.has(entryKey(entry))) {
      differences.push({ state: entry.state, path: entry.path, kind: 'added' });
    }
  }

  return differences;
}

export async function snapshotPresentation(
  page: Page,
  state = 'default',
): Promise<PresentationSnapshot> {
  return await page.evaluate(
    ({ stateName, layerSelectors, styleProperties }) => {
      const layerNames = ['panel-layer', 'lettering-layer'];
      const rounded = (value: number): number => {
        const result = Math.round(value * 2) / 2;
        return Object.is(result, -0) ? 0 : result;
      };
      const entries: PresentationEntry[] = [];

      function visit(element: Element, path: string): void {
        const computed = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        const styles = {} as PresentationStyles;

        for (const property of styleProperties) {
          styles[property] = computed.getPropertyValue(property);
        }

        entries.push({
          state: stateName,
          path,
          tag: element.tagName.toLowerCase(),
          rect: {
            x: rounded(rect.x),
            y: rounded(rect.y),
            width: rounded(rect.width),
            height: rounded(rect.height),
          },
          styles,
        });

        for (let index = 0; index < element.children.length; index += 1) {
          const child = element.children[index];
          if (child === undefined) continue;

          visit(child, `${path}/${child.tagName.toLowerCase()}:nth-child(${index + 1})`);
        }
      }

      for (let index = 0; index < layerSelectors.length; index += 1) {
        const selector = layerSelectors[index];
        const layerName = layerNames[index];
        if (selector === undefined || layerName === undefined) continue;

        for (const root of document.querySelectorAll(selector)) {
          visit(root, layerName);
        }
      }

      return entries;
    },
    {
      stateName: state,
      layerSelectors: [...PRESENTATION_LAYER_SELECTORS],
      styleProperties: [...PRESENTATION_STYLE_PROPERTIES],
    },
  );
}
