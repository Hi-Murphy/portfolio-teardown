import type {
  Box,
  ComponentSlab,
  LayerSlab,
  LayoutInput,
  LayoutOptions,
  ProjectLayout,
  Vec3,
} from './types';

export const LAYOUT_DEFAULTS: LayoutOptions = Object.freeze({
  componentSize: 0.8,
  componentThickness: 0.12,
  slabThickness: 0.08,
  margin: 0.3,
  explodedGap: 1.1,
  componentLift: 0.12,
});

type State = 'imploded' | 'exploded';

interface RawLayer {
  readonly id: string;
  readonly index: number;
  readonly size: Vec3;
  readonly implodedY: number;
  readonly explodedY: number;
}

interface RawComponent {
  readonly id: string;
  readonly layerId: string;
  readonly layerIndex: number;
  readonly slot: number;
  readonly cell: readonly [col: number, row: number];
  readonly size: Vec3;
  readonly x: number;
  readonly z: number;
  readonly implodedY: number;
  readonly explodedY: number;
}

interface StateFrame {
  readonly shift: number;
  readonly bounds: Box;
}

function clean(value: number): number {
  return value === 0 ? 0 : value;
}

function vec3(x: number, y: number, z: number): Vec3 {
  return [clean(x), clean(y), clean(z)];
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const key of Reflect.ownKeys(value)) {
      deepFreeze(Reflect.get(value, key));
    }
    Object.freeze(value);
  }

  return value;
}

function stateFrame(
  layers: readonly RawLayer[],
  components: readonly RawComponent[],
  state: State,
): StateFrame {
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;

  function include(x: number, y: number, z: number, size: Vec3): void {
    const halfX = size[0] / 2;
    const halfY = size[1] / 2;
    const halfZ = size[2] / 2;

    minX = Math.min(minX, x - halfX);
    minY = Math.min(minY, y - halfY);
    minZ = Math.min(minZ, z - halfZ);
    maxX = Math.max(maxX, x + halfX);
    maxY = Math.max(maxY, y + halfY);
    maxZ = Math.max(maxZ, z + halfZ);
  }

  const yKey = state === 'imploded' ? 'implodedY' : 'explodedY';

  for (const layer of layers) include(0, layer[yKey], 0, layer.size);
  for (const component of components) {
    include(component.x, component[yKey], component.z, component.size);
  }

  if (!Number.isFinite(minX)) {
    return { shift: 0, bounds: { min: vec3(0, 0, 0), max: vec3(0, 0, 0) } };
  }

  const shift = (minY + maxY) / 2;
  const halfHeight = (maxY - minY) / 2;

  return {
    shift,
    bounds: {
      min: vec3(minX, -halfHeight, minZ),
      max: vec3(maxX, halfHeight, maxZ),
    },
  };
}

export function layoutProject(
  project: LayoutInput,
  options: Partial<LayoutOptions> = {},
): ProjectLayout {
  const resolved: LayoutOptions = {
    componentSize: options.componentSize ?? LAYOUT_DEFAULTS.componentSize,
    componentThickness: options.componentThickness ?? LAYOUT_DEFAULTS.componentThickness,
    slabThickness: options.slabThickness ?? LAYOUT_DEFAULTS.slabThickness,
    margin: options.margin ?? LAYOUT_DEFAULTS.margin,
    explodedGap: options.explodedGap ?? LAYOUT_DEFAULTS.explodedGap,
    componentLift: options.componentLift ?? LAYOUT_DEFAULTS.componentLift,
  };
  const maxComponents = project.layers.reduce(
    (maximum, layer) => Math.max(maximum, layer.components.length),
    1,
  );
  const cols = Math.ceil(Math.sqrt(maxComponents));
  const rows = Math.ceil(maxComponents / cols);
  const width = cols + 2 * resolved.margin;
  const depth = rows + 2 * resolved.margin;
  const layerSize = vec3(width, resolved.slabThickness, depth);
  const componentSize = vec3(
    resolved.componentSize,
    resolved.componentThickness,
    resolved.componentSize,
  );
  const implodedPitch = resolved.slabThickness + resolved.componentThickness;
  const explodedPitch = implodedPitch + resolved.explodedGap;
  const rawLayers: RawLayer[] = [];
  const rawComponents: RawComponent[] = [];

  project.layers.forEach((layer, layerIndex) => {
    const componentCount = layer.components.length;
    const layerCols = componentCount === 0 ? 0 : Math.ceil(Math.sqrt(componentCount));
    const layerRows = layerCols === 0 ? 0 : Math.ceil(componentCount / layerCols);
    const rawImplodedY = -layerIndex * implodedPitch;
    const rawExplodedY = -layerIndex * explodedPitch;

    rawLayers.push({
      id: layer.id,
      index: layerIndex,
      size: layerSize,
      implodedY: rawImplodedY,
      explodedY: rawExplodedY,
    });

    layer.components.forEach((component, slot) => {
      const row = Math.floor(slot / layerCols);
      const col = slot % layerCols;
      const rowCount = row === layerRows - 1 ? componentCount - row * layerCols : layerCols;
      const x = col - (rowCount - 1) / 2;
      const z = row - (layerRows - 1) / 2;
      const componentImplodedY =
        rawImplodedY + resolved.slabThickness / 2 + resolved.componentThickness / 2;
      const componentExplodedY =
        rawExplodedY +
        resolved.slabThickness / 2 +
        resolved.componentThickness / 2 +
        resolved.componentLift;

      rawComponents.push({
        id: component.id,
        layerId: layer.id,
        layerIndex,
        slot,
        cell: [col, row],
        size: componentSize,
        x,
        z,
        implodedY: componentImplodedY,
        explodedY: componentExplodedY,
      });
    });
  });

  const implodedFrame = stateFrame(rawLayers, rawComponents, 'imploded');
  const explodedFrame = stateFrame(rawLayers, rawComponents, 'exploded');

  const layers: LayerSlab[] = rawLayers.map((layer) => ({
    id: layer.id,
    index: layer.index,
    size: layer.size,
    imploded: vec3(0, layer.implodedY - implodedFrame.shift, 0),
    exploded: vec3(0, layer.explodedY - explodedFrame.shift, 0),
  }));
  const components: ComponentSlab[] = rawComponents.map((component) => ({
    id: component.id,
    layerId: component.layerId,
    layerIndex: component.layerIndex,
    slot: component.slot,
    cell: component.cell,
    size: component.size,
    imploded: vec3(component.x, component.implodedY - implodedFrame.shift, component.z),
    exploded: vec3(component.x, component.explodedY - explodedFrame.shift, component.z),
  }));

  return deepFreeze({
    version: 1,
    footprint: { cols, rows, width: clean(width), depth: clean(depth) },
    layers,
    components,
    bounds: {
      imploded: implodedFrame.bounds,
      exploded: explodedFrame.bounds,
    },
  });
}
