import type { ReactNode } from 'react';

import { SiteFooter } from '../../components/site-footer';
import { SiteNav } from '../../components/site-nav';
import { SkipLink } from '../../components/skip-link';

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SkipLink />
      <SiteNav />
      <main id="main" tabIndex={-1} className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
