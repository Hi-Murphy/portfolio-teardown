import { SITE } from '../content/site';

const BUILD_YEAR = new Date().getFullYear();
const FOOTER_LINK_CLASS =
  'inline-flex min-h-11 items-center text-sm text-muted underline-offset-4 hover:text-fg hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

function siteLinkUrl(label: 'GitHub' | 'LinkedIn'): string | undefined {
  return SITE.identity.links.find((link) => link.label === label)?.url ?? undefined;
}

export function SiteFooter() {
  const githubUrl = siteLinkUrl('GitHub');
  const linkedInUrl = siteLinkUrl('LinkedIn');

  return (
    <footer id="contact" className="border-t border-line/30 bg-surface">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-5 py-8 sm:px-8">
        <p className="max-w-2xl text-sm text-muted">{SITE.footer.line}</p>
        <ul className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <li>
            <a href={`mailto:${SITE.identity.email}`} className={FOOTER_LINK_CLASS}>
              {SITE.footer.contactLabel} {SITE.identity.email}
            </a>
          </li>
          {githubUrl ? (
            <li>
              <a href={githubUrl} className={FOOTER_LINK_CLASS}>
                GitHub
              </a>
            </li>
          ) : null}
          {linkedInUrl ? (
            <li>
              <a href={linkedInUrl} className={FOOTER_LINK_CLASS}>
                LinkedIn
              </a>
            </li>
          ) : null}
          <li>
            <a href={SITE.identity.resume} className={FOOTER_LINK_CLASS}>
              Résumé<span className="sr-only"> (PDF)</span>
            </a>
          </li>
        </ul>
        <p className="text-xs text-muted">{`© ${BUILD_YEAR} ${SITE.identity.name}`}</p>
      </div>
    </footer>
  );
}
