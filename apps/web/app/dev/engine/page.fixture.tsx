import { EnginePlaygroundLoader } from './engine-playground-loader';

export default function EnginePlaygroundPage() {
  return (
    <main data-perf-fixture="engine" className="min-h-dvh bg-bg px-4 py-6 text-fg sm:px-8 sm:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Engine playground</h1>
          <p className="text-sm text-muted">Development fixture, not in production.</p>
        </header>
        <EnginePlaygroundLoader />
      </div>
    </main>
  );
}
