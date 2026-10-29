import { z } from 'zod';

// Explicit `name`s: bundlers minify class names, so `new.target.name` would print e.g. "gb" in build errors.
export class XploderValidationError extends Error {
  override name = 'XploderValidationError';
  readonly issues: z.core.$ZodIssue[];
  readonly cause: z.ZodError;

  constructor(message: string, cause: z.ZodError) {
    super(message);
    this.issues = cause.issues;
    this.cause = cause;
  }
}

export class ProjectValidationError extends XploderValidationError {
  override name = 'ProjectValidationError';
}

export class TechRegistryValidationError extends XploderValidationError {
  override name = 'TechRegistryValidationError';
}
