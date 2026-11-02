import { parseProject, parseTechRegistry, type Project } from 'xploder';
import { projectAJson, projectBJson, projectCJson, techRegistryJson } from 'xploder/fixtures';

import { EngineFallback } from './engine-fallback';
import { EnginePlaygroundLoader } from './engine-playground-loader';

const REGISTRY = parseTechRegistry(techRegistryJson);
const PROJECTS = [
  parseProject(projectAJson, { registry: REGISTRY }),
  parseProject(projectBJson, { registry: REGISTRY }),
  parseProject(projectCJson, { registry: REGISTRY }),
] as const satisfies readonly Project[];

export default function EnginePlaygroundPage() {
  return (
    <main data-perf-fixture="engine" className="min-h-dvh bg-bg px-4 py-6 text-fg sm:px-8 sm:py-10">
      <a
        href="#engine-controls"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:inline-flex focus:min-h-11 focus:items-center focus:rounded focus:border focus:border-line focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-fg focus:outline-2 focus:outline-offset-2 focus:outline-accent"
      >
        Skip to engine controls
      </a>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Engine playground</h1>
          <p className="text-sm text-muted">Development fixture, not in production.</p>
        </header>
        <EnginePlaygroundLoader />
        <noscript>
          <style>{'[data-engine-loading]{display:none}'}</style>
          <EngineFallback projects={PROJECTS} />
        </noscript>
      </div>
    </main>
  );
}
