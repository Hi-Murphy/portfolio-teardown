export const SCHEMA_VERSION = 1 as const;

export const COMPONENT_KINDS = ['module', 'service', 'store', 'external', 'actor'] as const;

export const COMPONENT_STATUSES = ['shipped', 'wip', 'planned'] as const;

export const TECH_CATEGORIES = [
  'language',
  'platform',
  'framework',
  'library',
  'storage',
  'network',
  'tooling',
  'ai',
] as const;

export const TECH_COLOR_REFS = [
  'tech-language',
  'tech-platform',
  'tech-framework',
  'tech-library',
  'tech-storage',
  'tech-network',
  'tech-tooling',
  'tech-ai',
  'accent',
] as const;

export type SchemaVersion = typeof SCHEMA_VERSION;
export type ComponentKind = (typeof COMPONENT_KINDS)[number];
export type ComponentStatus = (typeof COMPONENT_STATUSES)[number];
export type TechCategory = (typeof TECH_CATEGORIES)[number];
export type TechColorRef = (typeof TECH_COLOR_REFS)[number];
