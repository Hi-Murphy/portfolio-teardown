'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// The only client part of the nav: marks Projects as the current page on /projects*.
export function NavProjectsLink({ className }: { readonly className: string }) {
  const pathname = usePathname();
  const current = pathname === '/projects' || pathname.startsWith('/projects/');

  return (
    <Link href="/projects" className={className} aria-current={current ? 'page' : undefined}>
      Projects
    </Link>
  );
}
