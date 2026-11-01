import type { ComponentLettering } from '../../lettering/model';

export const FACE_NAMES_MIN_ZOOM = 2;

const EMPTY_NAMES: ReadonlyMap<string, string> = new Map();

export interface FaceLetteringInput {
  readonly zoomFactor: number;
  readonly columnActive: boolean;
  readonly names: ReadonlyMap<string, string>;
  readonly build: (names: ReadonlyMap<string, string>) => readonly ComponentLettering[];
}

export function faceLetteringAllOrNone(input: FaceLetteringInput): readonly ComponentLettering[] {
  if (input.columnActive || input.zoomFactor < FACE_NAMES_MIN_ZOOM) {
    return input.build(EMPTY_NAMES);
  }

  const items = input.build(input.names);
  const allFaceNamesPlaced = items.every(
    (item) => item.lettering.kind !== 'face' || item.lettering.namePx !== null,
  );

  return allFaceNamesPlaced ? items : input.build(EMPTY_NAMES);
}
