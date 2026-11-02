import type { Project } from 'xploder';
import type {
  MergeLeafTypes,
  PersonLeaf,
  SoftwareApplicationLeaf,
  SoftwareSourceCodeLeaf,
  WithContext,
} from 'schema-dts';

import type { SiteCopy } from '../content/site-copy';
import { SITE } from '../content/site';
import { absoluteUrl } from './site-url';

export type PersonLd = WithContext<PersonLeaf>;
export type ProjectLd = WithContext<
  MergeLeafTypes<[SoftwareApplicationLeaf, SoftwareSourceCodeLeaf]>
>;

function sameAsUrls(identity: SiteCopy['identity']): string[] {
  return identity.links.flatMap((link) => (link.url === null ? [] : [link.url]));
}

export function personLd(identity: SiteCopy['identity'] = SITE.identity): PersonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: identity.name,
    jobTitle: identity.role,
    url: absoluteUrl('/'),
    sameAs: sameAsUrls(identity),
  };
}

export function projectLd(project: Project): ProjectLd {
  const description = project.meta.summary ?? project.meta.tagline;
  const codeRepository = project.meta.links.find((link) => link.label === 'Source')?.url;

  return {
    '@context': 'https://schema.org',
    '@type': ['SoftwareApplication', 'SoftwareSourceCode'],
    name: project.meta.name,
    ...(description === undefined ? {} : { description }),
    url: absoluteUrl(`/projects/${project.meta.slug}`),
    author: {
      '@type': 'Person',
      name: SITE.identity.name,
      url: absoluteUrl('/'),
    },
    ...(codeRepository === undefined ? {} : { codeRepository }),
  };
}
