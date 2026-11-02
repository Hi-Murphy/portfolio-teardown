import Link from 'next/link';

import { ThemeToggle } from '../app/theme-toggle';
import { SITE } from '../content/site';

const NAV_LINK_CLASS =
  'inline-flex h-11 min-w-11 shrink-0 items-center justify-center px-2 text-sm font-medium text-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent';

function siteLinkUrl(label: 'GitHub' | 'LinkedIn'): string | undefined {
  return SITE.identity.links.find((link) => link.label === label)?.url ?? undefined;
}

function GitHubIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 .75a11.25 11.25 0 0 0-3.56 21.92c.56.1.77-.24.77-.54v-2.1c-3.13.68-3.79-1.33-3.79-1.33-.51-1.3-1.25-1.64-1.25-1.64-1.02-.7.08-.69.08-.69 1.13.08 1.72 1.16 1.72 1.16 1 .1 1.57-.65 1.57-.65.99-1.7 2.6-1.21 3.23-.93.1-.72.39-1.21.71-1.49-2.5-.28-5.13-1.25-5.13-5.56 0-1.23.44-2.23 1.16-3.02-.12-.28-.5-1.43.11-2.98 0 0 .94-.3 3.09 1.15a10.7 10.7 0 0 1 5.62 0c2.14-1.45 3.08-1.15 3.08-1.15.61 1.55.23 2.7.11 2.98.72.79 1.16 1.79 1.16 3.02 0 4.32-2.64 5.27-5.15 5.55.4.35.76 1.03.76 2.08v3.08c0 .3.2.65.78.54A11.25 11.25 0 0 0 12 .75Z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M5.34 3.5A1.84 1.84 0 1 0 5.33 7.18 1.84 1.84 0 0 0 5.34 3.5ZM3.75 8.75h3.17V21H3.75V8.75Zm5.26 0h3.04v1.67h.04c.42-.8 1.46-1.98 3.01-1.98 3.22 0 3.82 2.12 3.82 4.87V21h-3.17v-6.82c0-1.63-.03-3.72-2.27-3.72-2.27 0-2.62 1.77-2.62 3.6V21H9.01V8.75Z" />
    </svg>
  );
}

export function SiteNav() {
  const githubUrl = siteLinkUrl('GitHub');
  const linkedInUrl = siteLinkUrl('LinkedIn');

  return (
    <header className="border-b border-line/30 bg-bg">
      <div className="mx-auto w-full max-w-6xl px-3 sm:px-6">
        <nav aria-label="Primary" className="flex h-11 min-w-0 items-center">
          <Link
            href="/"
            className="inline-flex h-11 min-w-11 shrink-0 items-center pr-2 text-sm font-semibold tracking-tight text-fg focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
          >
            {SITE.meta.siteName}
          </Link>
          <div className="flex h-11 min-w-0 flex-1 items-center overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Link href="/projects" className={NAV_LINK_CLASS}>
              Projects
            </Link>
            <Link href="/#about" className={NAV_LINK_CLASS}>
              About
            </Link>
            <Link href="/#contact" className={NAV_LINK_CLASS}>
              Contact
            </Link>
            <a href={SITE.identity.resume} className={NAV_LINK_CLASS}>
              Résumé<span className="sr-only"> (PDF)</span>
            </a>
            {githubUrl ? (
              <a href={githubUrl} aria-label="GitHub" className={NAV_LINK_CLASS}>
                <GitHubIcon />
              </a>
            ) : null}
            {linkedInUrl ? (
              <a href={linkedInUrl} aria-label="LinkedIn" className={NAV_LINK_CLASS}>
                <LinkedInIcon />
              </a>
            ) : null}
          </div>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
