export interface SiteCopy {
  schemaVersion: 1;
  identity: {
    name: string;
    goesBy: string;
    role: string;
    location: string;
    email: string;
    links: {
      label: string;
      url: string | null;
    }[];
    resume: string;
  };
  hero: {
    eyebrow: string;
    headline: string;
    subline: string;
    primaryCta: {
      label: string;
      href: string;
    };
    secondaryCta: {
      label: string;
      href: string;
    };
    loopPause: string;
    loopPlay: string;
    /** Proof facts: indexes into the hero project's story.metrics. */
    proof: number[];
  };
  about: {
    title: string;
    paragraphs: string[];
    skillsNote: string;
  };
  projects: {
    title: string;
    emptyNote: string;
  };
  contact: {
    title: string;
  };
  footer: {
    line: string;
    contactLabel: string;
  };
  meta: {
    title: string;
    description: string;
    siteName: string;
    locale: string;
  };
}
