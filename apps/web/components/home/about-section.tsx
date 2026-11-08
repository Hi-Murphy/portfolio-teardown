import { AboutStrip } from '../about-strip';
import { SITE } from '../../content/site';
import { SectionFrame } from './section-frame';

export function AboutSection() {
  return (
    <SectionFrame
      id="about"
      sectionId="about"
      labelledBy="about-title"
      className="flex flex-col gap-5"
    >
      <AboutStrip
        title={SITE.about.title}
        paragraphs={SITE.about.paragraphs}
        skillsNote={SITE.about.skillsNote}
      />
    </SectionFrame>
  );
}
