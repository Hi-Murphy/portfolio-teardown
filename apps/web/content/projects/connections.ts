import { PROJECTS } from './index';
import { jevToolkitRelationships } from './jev-toolkit.relationships';
import { resolveConnections, type Connection, type RelationshipsSource } from './relationships';
import { websocketInspectorRelationships } from './websocket-inspector.relationships';

export const RELATIONSHIP_SOURCES: Readonly<Record<string, RelationshipsSource>> = {
  'websocket-inspector': websocketInspectorRelationships,
  'jev-toolkit': jevToolkitRelationships,
};

const CONNECTIONS = resolveConnections(RELATIONSHIP_SOURCES, PROJECTS);

export function connectionsFor(slug: string): readonly Connection[] {
  return CONNECTIONS.get(slug) ?? [];
}
