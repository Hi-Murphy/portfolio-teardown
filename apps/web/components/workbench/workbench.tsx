import type { Project } from 'xploder';

import { ProjectOutline } from '../project-outline';
import { TeardownPoster } from '../teardown-poster';

export interface WorkbenchProps {
  readonly project: Project;
}

export function WorkbenchLoader({ slug }: { readonly slug: string }) {
  void slug;
  return null;
}

export function Workbench({ project }: WorkbenchProps) {
  return (
    <div data-site-workbench="" className="grid grid-rows-[min(70svh,44rem)_3.5rem] gap-3">
      <div
        data-site-stage=""
        className="relative h-[min(70svh,44rem)] overflow-hidden rounded border border-line bg-surface"
      >
        <TeardownPoster
          project={project}
          state="exploded"
          className="absolute inset-0 h-full w-full"
        />
        <p data-site-loading="" className="sr-only">
          Loading teardown…
        </p>
        <div data-site-workbench-slot="" className="absolute inset-0">
          <WorkbenchLoader slug={project.meta.slug} />
        </div>
      </div>
      <div data-site-toolbar="" className="h-14 rounded border border-line bg-surface" />
      <noscript className="col-start-1 row-start-3 block">
        <style>{'[data-site-loading],[data-site-toolbar]{display:none}'}</style>
        <ProjectOutline project={project} className="mt-3" />
      </noscript>
    </div>
  );
}
