import Link from 'next/link';

import { SITE } from '../content/site';
import { GitHubIcon, LinkedInIcon, MailIcon, MonogramMark } from './icons';

const BUILD_YEAR = new Date().getFullYear();
const FOOTER_LINK_CLASS =
  'inline-flex h-11 items-center gap-2.5 text-sm text-muted underline-offset-4 hover:text-fg hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

function siteLinkUrl(label: 'GitHub' | 'LinkedIn'): string | undefined {
  return SITE.identity.links.find((link) => link.label === label)?.url ?? undefined;
}

export function SiteFooter() {
  const githubUrl = siteLinkUrl('GitHub');
  const linkedInUrl = siteLinkUrl('LinkedIn');

  return (
    <footer id="contact" className="border-t border-line/30 bg-surface">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="grid gap-10 sm:grid-cols-[1fr_auto] sm:gap-12">
          <div className="flex min-w-0 flex-col gap-4">
            <Link
              href="/"
              className="inline-flex w-fit items-center gap-3 text-base font-semibold tracking-tight text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <MonogramMark siteName={SITE.meta.siteName} />
              <span>{SITE.identity.name}</span>
            </Link>
            <p className="text-sm text-muted">
              {SITE.identity.role} · {SITE.identity.location}
            </p>
            <p className="max-w-2xl text-xs leading-relaxed text-muted">{SITE.footer.line}</p>
          </div>
          <div className="min-w-0 sm:min-w-52">
            <p className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-muted">
              Contact
            </p>
            <ul className="mt-2 flex flex-col">
              <li>
                <a href={`mailto:${SITE.identity.email}`} className={FOOTER_LINK_CLASS}>
                  <MailIcon />
                  <span>{SITE.identity.email}</span>
                </a>
              </li>
              {githubUrl ? (
                <li>
                  <a href={githubUrl} className={FOOTER_LINK_CLASS}>
                    <GitHubIcon />
                    <span>GitHub</span>
                  </a>
                </li>
              ) : null}
              {linkedInUrl ? (
                <li>
                  <a href={linkedInUrl} className={FOOTER_LINK_CLASS}>
                    <LinkedInIcon />
                    <span>LinkedIn</span>
                  </a>
                </li>
              ) : null}
            </ul>
          </div>
        </div>
        <div className="mt-10 flex min-h-11 items-center justify-between gap-4 border-t border-line/20 pt-4 text-xs text-muted">
          <p>{`© ${BUILD_YEAR} ${SITE.identity.name}`}</p>
          <a
            href="#main"
            className="inline-flex h-11 shrink-0 items-center underline-offset-4 hover:text-fg hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Back to top ↑
          </a>
        </div>
      </div>
    </footer>
  );
}
