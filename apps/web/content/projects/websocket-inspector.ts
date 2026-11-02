import { defineProject, type Project } from 'xploder';

import { SITE_REGISTRY } from '../tech-registry';
import { websocketInspectorSource } from './websocket-inspector.source';

export const websocketInspector: Project = defineProject(websocketInspectorSource, {
  registry: SITE_REGISTRY,
  source: 'websocket-inspector',
});
