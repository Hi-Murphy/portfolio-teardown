import { z } from 'zod';

export const IdSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(64);

export const LabelSchema = z.string().trim().min(1).max(120);

export const TextSchema = z.string().trim().min(1).max(2000);

export const LinkSchema = z.strictObject({
  label: LabelSchema,
  url: z.url({ protocol: /^https?$/ }),
});

export const MetricSchema = z.strictObject({
  label: LabelSchema,
  value: LabelSchema,
});

export type Link = z.output<typeof LinkSchema>;
export type Metric = z.output<typeof MetricSchema>;
