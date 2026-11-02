import type { Project } from 'xploder';

import { POSTER_FADE_CLASS } from '../hero/hero-classes';
import { ProjectOutline } from '../project-outline';
import { TeardownPoster } from '../teardown-poster';
import { WorkbenchLoader } from './workbench-loader';

export interface WorkbenchProps {
  readonly project: Project;
}

export function Workbench({ project }: WorkbenchProps) {
  return (
    <div
      data-site-workbench=""
      className="grid min-w-0 grid-rows-[min(70svh,44rem)_7rem_33.5rem] gap-3 sm:grid-rows-[min(70svh,44rem)_4rem_28rem]"
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
      </div>
      <div
        data-site-dock=""
        className="h-full min-w-0 overflow-hidden rounded border border-line/50 bg-surface"
      />
      <div
        data-site-tour=""
        className="h-full min-w-0 overflow-hidden rounded border border-line/50 bg-surface"
      />
      <noscript className="col-start-1 row-start-4 block">
        <style>
          {
            '[data-site-loading],[data-site-dock],[data-site-tour]{display:none!important}[data-site-workbench]{grid-template-rows:auto auto!important}'
          }
        </style>
        <ProjectOutline project={project} className="mt-3" />
      </noscript>
    </div>
  );
}
