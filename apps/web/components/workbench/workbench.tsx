import type { Project } from 'xploder';

import { POSTER_FADE_CLASS } from '../hero/hero-classes';
import { ProjectOutline } from '../project-outline';
import { TeardownPoster } from '../teardown-poster';
import { ExploreView } from './explore-view';
import { buildLayerModels } from './tour-model';
import { WorkbenchLoader } from './workbench-loader';

const EXPLORE_STATIC_CSS = '[data-site-explore-live] > [data-site-explore-static]{display:none}';
const EXPLORE_CONTROL_CLASS =
  'peer-data-[site-live-state=revealed]:hidden absolute left-1/2 top-1/2 z-10 inline-flex min-h-11 min-w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-2 whitespace-nowrap rounded border border-accent bg-accent px-5 text-sm font-semibold text-bg hover:border-fg hover:bg-accent/90 active:border-fg active:bg-accent/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

function CubeIcon() {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
      <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
    </svg>
  );
}

export interface WorkbenchProps {
  readonly project: Project;
}

export function Workbench({ project }: WorkbenchProps) {
  const layers = buildLayerModels(project);

  return (
    <div
      data-site-workbench=""
      className="grid min-w-0 grid-rows-[min(70svh,44rem)_7rem_auto] gap-3 sm:grid-rows-[min(70svh,44rem)_4rem_auto]"
    >
      <div
        data-site-stage=""
        className="relative h-[min(70svh,44rem)] min-w-0 overflow-hidden rounded border border-line bg-surface"
      >
        <p data-site-loading="" className="sr-only">
          Loading teardown…
        </p>
        <WorkbenchLoader slug={project.meta.slug} />
        <TeardownPoster project={project} state="exploded" className={POSTER_FADE_CLASS} />
        <button type="button" data-site-control="explore-3d" className={EXPLORE_CONTROL_CLASS}>
          <CubeIcon />
          <span data-site-control-label="">Explore in 3D</span>
        </button>
      </div>
      <div
        data-site-dock=""
        className="h-full min-w-0 overflow-hidden rounded border border-line/50 bg-surface"
      />
      <div
        data-site-tour=""
        className="h-full min-w-0 overflow-hidden rounded border border-line/50 bg-surface"
      >
        <style>{EXPLORE_STATIC_CSS}</style>
        <div data-site-explore-static="">
          <ExploreView mode="layers" layers={layers} focusedLayerId={null} />
        </div>
      </div>
      <noscript className="col-start-1 row-start-4 block">
        <style>
          {
            '[data-site-loading],[data-site-dock],[data-site-tour],[data-site-control="explore-3d"]{display:none!important}[data-site-workbench]{grid-template-rows:auto auto!important}'
          }
        </style>
        <ProjectOutline project={project} className="mt-3" />
      </noscript>
    </div>
  );
}
