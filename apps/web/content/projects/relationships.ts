/**
 * Site-level relationship content stays outside the strict xploder project schema (brief revision 1).
 */
import { IdSchema, LinkSchema, MetaSchema, type Project } from 'xploder';

export const RELATIONSHIP_KINDS = ['measured-on', 'shares-stack', 'same-engine'] as const;

export type RelationshipKind = (typeof RELATIONSHIP_KINDS)[number];

export interface RelationshipInput {
  readonly to: string;
  readonly kind: RelationshipKind;
  readonly note: string;
}

export interface RelationshipsSource {
  readonly relationships: readonly RelationshipInput[];
}

export interface Connection {
  readonly slug: string;
  readonly name: string;
  readonly kind: RelationshipKind;
  readonly note: string;
}

export interface RelationshipIssue {
  readonly path: readonly PropertyKey[];
  readonly message: string;
}

function isRelationshipKind(value: string): value is RelationshipKind {
  return (RELATIONSHIP_KINDS as readonly string[]).includes(value);
}

export const RelationshipSchema = LinkSchema.omit({ label: true, url: true }).extend({
  to: IdSchema,
  kind: IdSchema.refine(isRelationshipKind, {
    message: `Relationship kind must be one of: ${RELATIONSHIP_KINDS.join(', ')}.`,
  }),
  note: MetaSchema.shape.summary.unwrap(),
});

export function createRelationshipsSchema(context: {
  readonly self: string;
  readonly projects: ReadonlyMap<string, string>;
}) {
  const knownProjects = [...context.projects.keys()].join(', ');

  return RelationshipSchema.array()
    .default([])
    .superRefine((relationships, ctx) => {
      const seenTargets = new Set<string>();

      relationships.forEach((relationship, index) => {
        const { to } = relationship;

        if (to === context.self) {
          ctx.addIssue({
            code: 'custom',
            path: [index, 'to'],
            message: `Project "${context.self}" cannot have a relationship to itself.`,
          });
        } else if (!context.projects.has(to)) {
          ctx.addIssue({
            code: 'custom',
            path: [index, 'to'],
            message: `Unknown relationship target "${to}" in project "${context.self}". Known projects: ${knownProjects}.`,
          });
        } else if (seenTargets.has(to)) {
          ctx.addIssue({
            code: 'custom',
            path: [index, 'to'],
            message: `Duplicate relationship to "${to}" in project "${context.self}".`,
          });
        }

        seenTargets.add(to);
      });
    });
}

// Explicit `name`s survive minification, as in xploder's errors.ts.
export class RelationshipValidationError extends Error {
  override name = 'RelationshipValidationError';
  readonly issues: readonly RelationshipIssue[];

  constructor(message: string, issues: readonly RelationshipIssue[]) {
    super(message);
    this.issues = issues;
  }
}

interface RelationshipFailure {
  readonly self: string;
  readonly issues: readonly RelationshipIssue[];
}

function formatIssueLocation(path: readonly PropertyKey[]): string {
  return path.reduce<string>((location, segment) => {
    if (typeof segment === 'number') return `${location}[${segment}]`;

    return `${location}.${String(segment)}`;
  }, 'relationships');
}

function formatRelationshipError(failures: readonly RelationshipFailure[]): string {
  return failures
    .map(({ self, issues }) =>
      [
        `Invalid relationships (${self}):`,
        ...issues.flatMap((issue) => [
          `✖ ${issue.message}`,
          `  → at ${formatIssueLocation(issue.path)}`,
        ]),
      ].join('\n'),
    )
    .join('\n');
}

export function resolveConnections(
  sources: Readonly<Record<string, RelationshipsSource>>,
  projects: readonly Project[],
): ReadonlyMap<string, readonly Connection[]> {
  const projectNames = new Map(projects.map((project) => [project.meta.slug, project.meta.name]));
  const connections = new Map<string, readonly Connection[]>();
  const failures: RelationshipFailure[] = [];

  for (const [self, source] of Object.entries(sources)) {
    if (!projectNames.has(self)) {
      failures.push({
        self,
        issues: [
          {
            path: [],
            message: `Relationships file "${self}" has no matching project.`,
          },
        ],
      });
      continue;
    }

    const result = createRelationshipsSchema({ self, projects: projectNames }).safeParse(
      source.relationships,
    );

    if (!result.success) {
      failures.push({ self, issues: result.error.issues });
      continue;
    }

    connections.set(
      self,
      result.data.map((relationship) => ({
        slug: relationship.to,
        name: projectNames.get(relationship.to)!,
        kind: relationship.kind as RelationshipKind,
        note: relationship.note,
      })),
    );
  }

  if (failures.length > 0) {
    throw new RelationshipValidationError(
      formatRelationshipError(failures),
      failures.flatMap((failure) => failure.issues),
    );
  }

  return connections;
}
