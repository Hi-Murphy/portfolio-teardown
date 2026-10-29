import { z } from 'zod';

import { SCHEMA_VERSION, TECH_CATEGORIES, TECH_COLOR_REFS, type TechColorRef } from './constants';
import { IdSchema, LabelSchema } from './primitives';

export const TechSchema = z
  .strictObject({
    id: IdSchema,
    label: LabelSchema,
    category: z.enum(TECH_CATEGORIES),
    color: z.enum(TECH_COLOR_REFS).optional(),
  })
  .transform((tech) => {
    const defaultColor: TechColorRef = `tech-${tech.category}`;
    return { ...tech, color: tech.color ?? defaultColor };
  });

export const TechRegistrySchema = z
  .strictObject({
    schemaVersion: z.literal(SCHEMA_VERSION),
    techs: z.array(TechSchema),
  })
  .superRefine((registry, ctx) => {
    const seen = new Set<string>();

    registry.techs.forEach((tech, index) => {
      if (seen.has(tech.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['techs', index, 'id'],
          message: `Duplicate tech id "${tech.id}".`,
        });
      }

      seen.add(tech.id);
    });
  });

export type Tech = z.output<typeof TechSchema>;
export type TechInput = z.input<typeof TechSchema>;
export type TechRegistry = z.output<typeof TechRegistrySchema>;
export type TechRegistryInput = z.input<typeof TechRegistrySchema>;
