import type { ComponentKind } from '../schema/constants';
import { partNumber } from '../overlay/parts';

export interface NavigatorProject {
  readonly layers: readonly {
    readonly id: string;
    readonly name?: string;
    readonly components: readonly {
      readonly id: string;
      readonly name?: string;
      readonly kind?: ComponentKind;
    }[];
  }[];
}

export interface NavigatorItem {
  readonly id: string;
  readonly name: string;
  readonly layerId: string;
  readonly layerName: string;
  readonly kind: ComponentKind;
  readonly itemNumber: string;
}

export type NavigatorAction =
  { readonly type: 'move'; readonly index: number } | { readonly type: 'activate' };

function wrappedIndex(index: number, count: number): number {
  return ((index % count) + count) % count;
}

export function navigatorItems(project: NavigatorProject): readonly NavigatorItem[] {
  return project.layers.flatMap((layer, layerIndex) =>
    layer.components.map((component, componentIndex) => ({
      id: component.id,
      name: component.name ?? component.id,
      layerId: layer.id,
      layerName: layer.name ?? layer.id,
      kind: component.kind ?? 'module',
      itemNumber: partNumber(layerIndex, componentIndex),
    })),
  );
}

export function navigatorKey(key: string, index: number, count: number): NavigatorAction | null {
  if (count <= 0) return null;

  switch (key) {
    case 'ArrowDown':
      return { type: 'move', index: wrappedIndex(index + 1, count) };
    case 'ArrowUp':
      return { type: 'move', index: wrappedIndex(index - 1, count) };
    case 'Home':
      return { type: 'move', index: 0 };
    case 'End':
      return { type: 'move', index: count - 1 };
    case 'Enter':
    case ' ':
      return { type: 'activate' };
    default:
      return null;
  }
}
