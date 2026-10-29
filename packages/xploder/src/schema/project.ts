import { z } from 'zod';

import { COMPONENT_KINDS, COMPONENT_STATUSES, SCHEMA_VERSION } from './constants';
import { IdSchema, LabelSchema, LinkSchema, MetricSchema, TextSchema } from './primitives';
import type { TechRegistry } from './tech';

export const MetaSchema = z.strictObject({
  slug: IdSchema,
  name: LabelSchema,
  tagline: LabelSchema.optional(),
  summary: TextSchema.optional(),
  year: z.number().int().optional(),
  role: LabelSchema.optional(),
  tags: z.array(LabelSchema).optional(),
  links: z.array(LinkSchema).default([]),
});

export const StorySchema = z.strictObject({
  headline: LabelSchema.optional(),
  problem: TextSchema.optional(),
  approach: TextSchema.optional(),
  outcome: TextSchema.optional(),
  metrics: z.array(MetricSchema).default([]),
});

export const ComponentSchema = z.strictObject({
  id: IdSchema,
  name: LabelSchema,
  summary: LabelSchema.optional(),
  description: TextSchema.optional(),
  kind: z.enum(COMPONENT_KINDS).default('module'),
  status: z.enum(COMPONENT_STATUSES).default('shipped'),
  techs: z.array(IdSchema).default([]),
  links: z.array(LinkSchema).default([]),
  metrics: z.array(MetricSchema).default([]),
});

export const LayerSchema = z.strictObject({
  id: IdSchema,
  name: LabelSchema,
  description: TextSchema.optional(),
  components: z.array(ComponentSchema).default([]),
});

export const FlowSchema = z.strictObject({
  id: IdSchema.optional(),
  label: LabelSchema.optional(),
  description: TextSchema.optional(),
  path: z.array(IdSchema).min(2),
});

function createProjectShapeSchema() {
  return z.strictObject({
    schemaVersion: z.literal(SCHEMA_VERSION),
    meta: MetaSchema,
    story: StorySchema.prefault({}),
    layers: z.array(LayerSchema).min(1),
    flows: z.array(FlowSchema).default([]),
  });
}

export function createProjectSchema(registry?: TechRegistry) {
  const registryTechIds = new Set(registry?.techs.map((tech) => tech.id));

  return createProjectShapeSchema()
    .superRefine((project, ctx) => {
      const layerIds = new Set<string>();
      const componentIds = new Set<string>();

      project.layers.forEach((layer, layerIndex) => {
        if (layerIds.has(layer.id)) {
          ctx.addIssue({
            code: 'custom',
            path: ['layers', layerIndex, 'id'],
            message: `Duplicate layer id "${layer.id}".`,
          });
        }
        layerIds.add(layer.id);

        layer.components.forEach((component, componentIndex) => {
          if (componentIds.has(component.id)) {
            ctx.addIssue({
              code: 'custom',
              path: ['layers', layerIndex, 'components', componentIndex, 'id'],
              message: `Duplicate component id "${component.id}".`,
            });
          }
          componentIds.add(component.id);

          if (registry) {
            component.techs.forEach((techId, techIndex) => {
              if (!registryTechIds.has(techId)) {
                ctx.addIssue({
                  code: 'custom',
                  path: ['layers', layerIndex, 'components', componentIndex, 'techs', techIndex],
                  message: `Unknown tech id "${techId}". Not in the registry.`,
                });
              }
            });
          }
        });
      });

      const flowIds = new Set<string>();

      project.flows.forEach((flow, flowIndex) => {
        const flowId = flow.id ?? `flow-${flowIndex + 1}`;

        if (flowIds.has(flowId)) {
          ctx.addIssue({
            code: 'custom',
            path: ['flows', flowIndex, 'id'],
            message: `Duplicate flow id "${flowId}".`,
          });
        }
        flowIds.add(flowId);

        flow.path.forEach((componentId, pathIndex) => {
          if (!componentIds.has(componentId)) {
            ctx.addIssue({
              code: 'custom',
              path: ['flows', flowIndex, 'path', pathIndex],
              message: `Unknown component id "${componentId}" in flow path.`,
            });
          }
        });
      });
    })
    .transform((project) => ({
      ...project,
      flows: project.flows.map((flow, index) => ({
        ...flow,
        id: flow.id ?? `flow-${index + 1}`,
      })),
    }));
}

export const ProjectSchema = createProjectSchema();

export type Meta = z.output<typeof MetaSchema>;
export type Story = z.output<typeof StorySchema>;
export type Component = z.output<typeof ComponentSchema>;
export type Layer = z.output<typeof LayerSchema>;
export type Project = z.output<typeof ProjectSchema>;
/** A parsed flow: `id` is always present (defaulted to `flow-<n>`). */
export type Flow = Project['flows'][number];
export type ProjectInput = z.input<typeof ProjectSchema>;
