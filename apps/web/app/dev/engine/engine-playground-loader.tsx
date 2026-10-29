'use client';

import dynamic from 'next/dynamic';

const EnginePlayground = dynamic(
  () => import('./engine-playground').then((module) => module.EnginePlayground),
  {
    ssr: false,
    loading: () => <p className="text-sm text-muted">Loading engine…</p>,
  },
);

export function EnginePlaygroundLoader() {
  return <EnginePlayground />;
}
