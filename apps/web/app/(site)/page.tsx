import { HOME_SECTION_REGISTRY } from '../../components/home/registry';
import { HomeSnapStyle } from '../../components/home/home-snap-style';
import { JsonLd } from '../../components/json-ld';
import {
  HOME_SECTIONS,
  LAYOUT_SECTIONS,
  type HomeSectionId,
  type PageSectionId,
} from '../../content/home-sections';
import { personLd } from '../../seo/json-ld';
import { routeMetadata } from '../../seo/metadata';
import { HOME_ROUTE } from '../../seo/routes';

const LAYOUT_SECTION_IDS = new Set<HomeSectionId>(LAYOUT_SECTIONS);

export const metadata = routeMetadata(HOME_ROUTE);

export default function HomePage() {
  const pageSections = HOME_SECTIONS.filter(
    (id): id is PageSectionId => !LAYOUT_SECTION_IDS.has(id),
  );
  const heroIndex = pageSections.indexOf('hero');
  const beforeHero = heroIndex === -1 ? pageSections : pageSections.slice(0, heroIndex);
  const heroSection: PageSectionId | null =
    heroIndex === -1 ? null : (pageSections[heroIndex] ?? null);
  const afterHero = heroIndex === -1 ? [] : pageSections.slice(heroIndex + 1);

  const section = (id: PageSectionId) => {
    const Section = HOME_SECTION_REGISTRY[id];
    return <Section key={id} />;
  };

  return (
    <>
      <HomeSnapStyle />
      <JsonLd data={personLd()} />
      {beforeHero.map(section)}
      {heroSection === null ? null : section(heroSection)}
      {afterHero.length === 0 ? null : (
        <div data-home-snap-sections="">{afterHero.map(section)}</div>
      )}
    </>
  );
}
