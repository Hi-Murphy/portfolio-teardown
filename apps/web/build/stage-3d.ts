export const STAGES_3D = [
  // @ts-expect-error three has no app-level declarations; the build alias resolves it.
  () => import('three'),
  () => import('@react-three/fiber'),
] as const;
