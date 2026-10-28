/**
 * xploder motion tokens — the ONLY source of easings, durations and staggers
 * for apps/web and xploder. Import via `xploder/motion`; never write literal
 * motion values elsewhere. Values (and reduced-motion handling) land in Slice 02.
 */
export const durations = {} as const satisfies Record<string, number>; // seconds
export const easings = {} as const satisfies Record<string, string>; // GSAP ease strings / CSS cubic-bezier
export const staggers = {} as const satisfies Record<string, number>; // seconds

export const motion = { durations, easings, staggers } as const;
export type MotionTokens = typeof motion;
