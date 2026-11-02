'use client';

import { useCallback, useRef, type ComponentProps, type ReactNode } from 'react';
import {
  TeardownViewer,
  useTeardownViewer,
  type ViewerPanelsHandle,
  type ViewerProject,
} from 'xploder/react';

export interface LiveViewerProps {
  readonly project: ViewerProject;
  readonly initial?: 'imploded' | 'exploded';
  readonly panels?: ViewerPanelsHandle;
  readonly registry?: ComponentProps<typeof TeardownViewer>['registry'];
  readonly fallback?: ReactNode;
  readonly onFirstFrame?: () => void;
  readonly className?: string;
  readonly 'aria-label'?: string;
}

export function LiveViewer({
  project,
  initial,
  panels,
  registry,
  fallback,
  onFirstFrame,
  className,
  'aria-label': ariaLabel,
}: LiveViewerProps) {
  const viewer = useTeardownViewer({ initial, project });
  const firstFrameRef = useRef(false);
  const onStats = useCallback(() => {
    if (firstFrameRef.current) return;

    firstFrameRef.current = true;
    onFirstFrame?.();
  }, [onFirstFrame]);

  return (
    <TeardownViewer
      project={project}
      viewer={viewer}
      panels={panels}
      registry={registry}
      fallback={fallback}
      onStats={onStats}
      className={className}
      aria-label={ariaLabel}
    />
  );
}
