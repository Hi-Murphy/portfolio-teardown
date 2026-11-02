'use client';

import dynamic from 'next/dynamic';

const WorkbenchClient = dynamic(
  () => import('./workbench-client').then((module) => module.WorkbenchClient),
  { ssr: false, loading: () => null },
);

export function WorkbenchLoader({ slug }: { readonly slug: string }) {
  return <WorkbenchClient slug={slug} />;
}
