// The approved home composition (S11.9 G1). Order is data; the page renders from it.
export const HOME_SECTIONS = ['nav', 'hero', 'projects', 'about', 'contact', 'footer'] as const;
export type HomeSectionId = (typeof HOME_SECTIONS)[number];

// 'nav' and 'footer' are rendered by app/(site)/layout.tsx (shared with every route).
export const LAYOUT_SECTIONS = ['nav', 'footer'] as const satisfies readonly HomeSectionId[];

export type PageSectionId = Exclude<HomeSectionId, (typeof LAYOUT_SECTIONS)[number]>;
