'use client';

import type { Project } from 'xploder';

import { LiveViewer } from '../viewer/live-viewer';

export interface HeroStageProps {
  readonly project: Project;
  readonly onFirstFrame: () => void;
}

export function HeroStage({ project, onFirstFrame }: HeroStageProps) {
  return (
    <LiveViewer
      project={project}
      initial="exploded"
      onFirstFrame={onFirstFrame}
      fallback={null}
      className="h-full w-full"
    />
  );
}
