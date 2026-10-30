import type { ProjectLayout, SlabPlacement, Vec3 } from '../layout';

export interface Ray {
  readonly origin: Vec3;
  readonly direction: Vec3;
}

function axisDistance(
  origin: number,
  direction: number,
  min: number,
  max: number,
): readonly [near: number, far: number] | null {
  if (direction === 0) {
    return origin < min || origin > max ? null : [-Infinity, Infinity];
  }

  const first = (min - origin) / direction;
  const second = (max - origin) / direction;

  return first <= second ? [first, second] : [second, first];
}

export function rayBoxDistance(ray: Ray, center: Vec3, size: Vec3): number | null {
  let near = -Infinity;
  let far = Infinity;

  for (const axis of [0, 1, 2] as const) {
    const origin = ray.origin[axis];
    const direction = ray.direction[axis];
    const halfSize = size[axis] / 2;
    const interval = axisDistance(
      origin,
      direction,
      center[axis] - halfSize,
      center[axis] + halfSize,
    );

    if (interval === null) return null;

    near = Math.max(near, interval[0]);
    far = Math.min(far, interval[1]);

    if (near > far) return null;
  }

  return far < 0 ? null : Math.max(near, 0);
}

function centerAt(placement: SlabPlacement, progress: number): Vec3 {
  return [
    placement.imploded[0] + (placement.exploded[0] - placement.imploded[0]) * progress,
    placement.imploded[1] + (placement.exploded[1] - placement.imploded[1]) * progress,
    placement.imploded[2] + (placement.exploded[2] - placement.imploded[2]) * progress,
  ];
}

function progressAt(progress: ArrayLike<number>, index: number): number {
  const value = progress[index];

  if (value === undefined) throw new RangeError(`Missing explode progress at index ${index}`);
  return value;
}

export function pick(ray: Ray, layout: ProjectLayout, progress: ArrayLike<number>): number | null {
  let nearest = Infinity;
  let hit: number | null = null;

  layout.layers.forEach((layer, index) => {
    const center = centerAt(layer, progressAt(progress, index));
    const distance = rayBoxDistance(ray, center, layer.size);

    if (distance !== null && distance < nearest) {
      nearest = distance;
      hit = null;
    }
  });

  const componentOffset = layout.layers.length;

  layout.components.forEach((component, index) => {
    const center = centerAt(component, progressAt(progress, componentOffset + index));
    const distance = rayBoxDistance(ray, center, component.size);

    if (distance !== null && distance < nearest) {
      nearest = distance;
      hit = index;
    }
  });

  return hit;
}
