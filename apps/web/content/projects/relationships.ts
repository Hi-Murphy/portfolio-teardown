/**
 * Site-level relationship content stays outside the strict xploder project schema (brief revision 1).
 */
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
