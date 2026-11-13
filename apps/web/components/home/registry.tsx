import type { ReactElement } from 'react';

import type { PageSectionId } from '../../content/home-sections';
import { AboutSection } from './about-section';
import { ContactSection } from './contact-section';
import { HeroSection } from './hero-section';
import { ProjectsSection } from './projects-section';

export const HOME_SECTION_REGISTRY: Record<PageSectionId, () => ReactElement> = {
  hero: HeroSection,
  projects: ProjectsSection,
  about: AboutSection,
  contact: ContactSection,
};
