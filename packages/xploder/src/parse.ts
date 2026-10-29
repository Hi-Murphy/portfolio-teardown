import { z } from 'zod';

import { TechRegistryValidationError } from './errors';
import { TechRegistrySchema, type TechRegistry, type TechRegistryInput } from './schema/tech';

export function parseTechRegistry(json: unknown): TechRegistry {
  const result = TechRegistrySchema.safeParse(json);

  if (!result.success) {
    throw new TechRegistryValidationError(
      `Invalid tech registry:\n${z.prettifyError(result.error)}`,
      result.error,
    );
  }

  return result.data;
}

export function defineTechRegistry(input: TechRegistryInput): TechRegistry {
  return parseTechRegistry(input);
}
