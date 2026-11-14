import { defineProject, type Project } from 'xploder';

import { SITE_REGISTRY } from '../tech-registry';
import { jevToolkitSource } from './jev-toolkit.source';

export const jevToolkit: Project = defineProject(jevToolkitSource, {
  registry: SITE_REGISTRY,
  source: 'jev-toolkit',
});
