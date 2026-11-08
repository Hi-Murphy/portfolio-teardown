import { HOME_SECTION_REGISTRY } from '../../components/home/registry';
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

  return (
    <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
      <JsonLd data={personLd()} />
      {pageSections.map((id) => {
        const Section = HOME_SECTION_REGISTRY[id];
        return <Section key={id} />;
      })}
    </div>
  );
}
