import { z } from 'zod';

import { ProjectValidationError, TechRegistryValidationError } from './errors';
import { createProjectSchema, type Project, type ProjectInput } from './schema/project';
import { TechRegistrySchema, type TechRegistry, type TechRegistryInput } from './schema/tech';

type ProjectOptions = { registry?: TechRegistry };
type DefineProjectOptions = { registry: TechRegistry; source?: string };

export function safeParseProject(
  json: unknown,
  options: ProjectOptions = {},
): z.ZodSafeParseResult<Project> {
  return createProjectSchema(options.registry).safeParse(json);
}

export function parseProject(json: unknown, options: ProjectOptions = {}): Project {
  const result = safeParseProject(json, options);

  if (!result.success) {
    throw new ProjectValidationError(
      `Invalid project:\n${z.prettifyError(result.error)}`,
      result.error,
    );
  }

  return result.data;
}

export function defineProject(input: ProjectInput, options: DefineProjectOptions): Project {
  const result = createProjectSchema(options.registry).safeParse(input);

  if (!result.success) {
    const source = options.source ? ` (${options.source})` : '';
    throw new ProjectValidationError(
      `Invalid project${source}:\n${z.prettifyError(result.error)}`,
      result.error,
    );
  }

  return result.data;
}

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
