export type Vec3 = readonly [x: number, y: number, z: number];

export interface Box {
  readonly min: Vec3;
  readonly max: Vec3;
}

export interface LayoutInput {
  readonly layers: readonly {
    readonly id: string;
    readonly components: readonly { readonly id: string }[];
  }[];
}

export interface LayoutOptions {
  readonly componentSize: number;
  readonly componentThickness: number;
  readonly slabThickness: number;
  readonly margin: number;
  readonly explodedGap: number;
  readonly componentLift: number;
}

export interface SlabPlacement {
  readonly size: Vec3;
  readonly imploded: Vec3;
  readonly exploded: Vec3;
}

export interface LayerSlab extends SlabPlacement {
  readonly id: string;
  readonly index: number;
}

export interface ComponentSlab extends SlabPlacement {
  readonly id: string;
  readonly layerId: string;
  readonly layerIndex: number;
  readonly slot: number;
  readonly cell: readonly [col: number, row: number];
}

export interface ProjectLayout {
  readonly version: 1;
  readonly footprint: {
    readonly cols: number;
    readonly rows: number;
    readonly width: number;
    readonly depth: number;
  };
  readonly layers: readonly LayerSlab[];
  readonly components: readonly ComponentSlab[];
  readonly bounds: {
    readonly imploded: Box;
    readonly exploded: Box;
  };
}
