import Link from 'next/link';

import { ThemeToggle } from '../app/theme-toggle';
import { SITE } from '../content/site';
import { GitHubIcon, LinkedInIcon, MonogramMark } from './icons';
import { NavProjectsLink } from './nav-projects-link';

const NAV_LINK_CLASS =
  'inline-flex h-11 min-w-9 shrink-0 items-center justify-center px-1 text-sm font-medium text-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent sm:px-2';
const SOCIAL_LINK_CLASS =
  'inline-flex h-11 w-9 shrink-0 items-center justify-center text-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent';

function siteLinkUrl(label: 'GitHub' | 'LinkedIn'): string | undefined {
  return SITE.identity.links.find((link) => link.label === label)?.url ?? undefined;
}

export function SiteNav() {
  const githubUrl = siteLinkUrl('GitHub');
  const linkedInUrl = siteLinkUrl('LinkedIn');

  return (
    <header className="border-b border-line/30 bg-bg">
      <div className="mx-auto w-full max-w-6xl px-1.5 sm:px-6">
        <nav aria-label="Primary" className="flex h-11 min-w-0 items-center">
          <Link
            href="/"
            className="inline-flex h-11 min-w-9 shrink-0 items-center text-sm font-semibold tracking-tight text-fg focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent sm:gap-2"
          >
            <MonogramMark siteName={SITE.meta.siteName} />
            <span className="sr-only sm:not-sr-only sm:inline sm:whitespace-nowrap">
              {SITE.meta.siteName}
            </span>
          </Link>
          <div className="flex h-11 min-w-0 flex-1 items-center justify-end sm:gap-1">
            <NavProjectsLink className={NAV_LINK_CLASS} />
            <Link href="/#about" className={NAV_LINK_CLASS}>
              About
            </Link>
            <Link href="/#contact" className={NAV_LINK_CLASS}>
              Contact
            </Link>
            <span aria-hidden="true" className="mx-1 h-5 w-px shrink-0 bg-line/30" />
            {githubUrl ? (
              <a href={githubUrl} aria-label="GitHub" className={SOCIAL_LINK_CLASS}>
                <GitHubIcon />
              </a>
            ) : null}
            {linkedInUrl ? (
              <a href={linkedInUrl} aria-label="LinkedIn" className={SOCIAL_LINK_CLASS}>
                <LinkedInIcon />
              </a>
            ) : null}
          </div>
          <span className="sm:ml-1">
            <ThemeToggle />
          </span>
        </nav>
      </div>
    </header>
  );
}
