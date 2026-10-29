export const XPLODER_VERSION = '0.0.0';

export {
  COMPONENT_KINDS,
  COMPONENT_STATUSES,
  SCHEMA_VERSION,
  TECH_CATEGORIES,
  TECH_COLOR_REFS,
} from './schema/constants';
export type {
  ComponentKind,
  ComponentStatus,
  SchemaVersion,
  TechCategory,
  TechColorRef,
} from './schema/constants';

export { IdSchema, LinkSchema, MetricSchema } from './schema/primitives';
export type { Link, Metric } from './schema/primitives';

export { TechRegistrySchema, TechSchema } from './schema/tech';
export type { Tech, TechRegistry, TechRegistryInput } from './schema/tech';

export {
  ComponentSchema,
  FlowSchema,
  LayerSchema,
  MetaSchema,
  ProjectSchema,
  StorySchema,
  createProjectSchema,
} from './schema/project';
export type { Component, Flow, Layer, Meta, Project, ProjectInput, Story } from './schema/project';

export {
  ProjectValidationError,
  TechRegistryValidationError,
  XploderValidationError,
} from './errors';

export {
  defineProject,
  defineTechRegistry,
  parseProject,
  parseTechRegistry,
  safeParseProject,
} from './parse';
