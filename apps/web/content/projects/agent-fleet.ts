import { defineProject, type Project } from 'xploder';

import { SITE_REGISTRY } from '../tech-registry';
import { agentFleetSource } from './agent-fleet.source';

export const agentFleet: Project = defineProject(agentFleetSource, {
  registry: SITE_REGISTRY,
  source: 'agent-fleet',
});
