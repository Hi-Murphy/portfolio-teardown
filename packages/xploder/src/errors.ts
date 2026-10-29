import { z } from 'zod';

export class XploderValidationError extends Error {
  readonly issues: z.core.$ZodIssue[];
  readonly cause: z.ZodError;

  constructor(message: string, cause: z.ZodError) {
    super(message);
    this.name = new.target.name;
    this.issues = cause.issues;
    this.cause = cause;
  }
}

export class ProjectValidationError extends XploderValidationError {}

export class TechRegistryValidationError extends XploderValidationError {}
