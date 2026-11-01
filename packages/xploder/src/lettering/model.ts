import type { ProjectLayout } from '../layout';
import { partShortText } from '../overlay/parts';
import type { Vec2 } from '../overlay/project';

import type { FaceQuad } from './faces';
import { letterPart, type Lettering } from './place';

export interface LetteringModelComponent {
  readonly id: string;
  readonly layerIndex: number;
  readonly slot: number;
  readonly quad: FaceQuad;
  readonly hull: readonly Vec2[];
}

export interface LetteringModelLayer {
  readonly index: number;
  readonly corners: readonly Vec2[];
}

export interface LetteringModelInput {
  readonly layout: ProjectLayout;
  readonly components: readonly LetteringModelComponent[];
  readonly layers: readonly LetteringModelLayer[];
  readonly names: ReadonlyMap<string, string>;
}

export interface ComponentLettering {
  readonly id: string;
  readonly layerIndex: number;
  readonly number: string;
  readonly lettering: Lettering;
}

export function letteringModel(input: LetteringModelInput): readonly ComponentLettering[] {
  return input.components.map((component) => {
    const occluders: (readonly Vec2[])[] = [];

    for (const other of input.components) {
      if (other.layerIndex < component.layerIndex) occluders.push(other.hull);
    }

    for (const layer of input.layers) {
      if (layer.index < component.layerIndex) occluders.push(layer.corners);
    }

    return {
      id: component.id,
      layerIndex: component.layerIndex,
      number: partShortText(component.layerIndex, component.slot),
      lettering: letterPart({
        quad: component.quad,
        number: partShortText(component.layerIndex, component.slot),
        name: input.names.get(component.id) ?? null,
        occluders,
      }),
    };
  });
}
