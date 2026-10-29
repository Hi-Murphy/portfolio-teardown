import type { TechCategory } from 'xploder';
import { TECH_CATEGORIES, XPLODER_VERSION } from 'xploder';

import { motionTokens } from './motion';
import { ThemeToggle } from './theme-toggle';

const ROLE_SWATCHES = [
  { role: 'paper', className: 'bg-bg' },
  { role: 'surface', className: 'bg-surface' },
  { role: 'grid', className: 'bg-grid' },
  { role: 'line', className: 'bg-line' },
  { role: 'line-muted', className: 'bg-line-muted' },
  { role: 'ink', className: 'bg-fg' },
  { role: 'label', className: 'bg-muted' },
  { role: 'accent', className: 'bg-accent' },
  { role: 'steel', className: 'bg-steel' },
] as const;

const TECH_SWATCH_CLASSES: Record<TechCategory, string> = {
  language: 'bg-tech-language',
  platform: 'bg-tech-platform',
  framework: 'bg-tech-framework',
  library: 'bg-tech-library',
  storage: 'bg-tech-storage',
  network: 'bg-tech-network',
  tooling: 'bg-tech-tooling',
  ai: 'bg-tech-ai',
};

const GRID_STYLE = {
  backgroundImage:
    'linear-gradient(to right, var(--color-grid) 1px, transparent 1px), linear-gradient(to bottom, var(--color-grid) 1px, transparent 1px)',
  backgroundSize: '32px 32px',
};

export default function HomePage() {
  return (
    <div className="relative isolate mx-auto flex min-h-dvh max-w-3xl flex-col overflow-hidden px-5 sm:px-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-70"
        style={GRID_STYLE}
      />
      <header className="relative flex justify-end py-4">
        <ThemeToggle />
      </header>
      <main className="relative flex flex-1 flex-col justify-center gap-10 py-12">
        <div className="flex flex-col gap-3">
          <h1 className="font-semibold tracking-tight text-[clamp(2rem,8vw,4rem)] leading-[1.05]">
            Portfolio Teardown
          </h1>
          <p className="text-muted text-[clamp(1rem,3.5vw,1.25rem)]">
            coming online slice by slice
          </p>
        </div>
        <section
          aria-labelledby="palette-heading"
          className="rounded-sm border border-line/30 bg-surface p-4 sm:p-5"
        >
          <p
            id="palette-heading"
            className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted"
          >
            palette · blueprint v1
          </p>
          <div aria-hidden="true" className="mt-4 flex flex-wrap gap-2">
            {ROLE_SWATCHES.map(({ role, className }) => (
              <div
                key={role}
                className="flex items-center gap-2 rounded-sm border border-line/20 bg-bg px-2 py-1"
              >
                <span className={`h-4 w-4 rounded-[2px] border border-line/30 ${className}`} />
                <span className="font-mono text-[0.625rem] text-muted">{role}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TECH_CATEGORIES.map((category) => (
              <div
                key={category}
                className="flex items-center gap-2 rounded-sm border border-line/20 bg-bg px-2.5 py-1.5"
              >
                <span
                  aria-hidden="true"
                  className={`h-2.5 w-2.5 rounded-full ${TECH_SWATCH_CLASSES[category]}`}
                />
                <span className="font-mono text-[0.6875rem] text-fg">{category}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
      <footer
        className="relative py-6 text-sm text-muted"
        data-motion-tokens={Object.keys(motionTokens).length}
      >{`renderer: xploder v${XPLODER_VERSION}`}</footer>
    </div>
  );
}
