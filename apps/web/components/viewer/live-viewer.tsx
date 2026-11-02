'use client';

import { useCallback, useRef, type ComponentProps, type ReactNode } from 'react';
import {
  TeardownViewer,
  useTeardownViewer,
  type TeardownViewerHandle,
  type ViewerPanelsHandle,
  type ViewerProject,
} from 'xploder/react';

export { useViewerPanels } from 'xploder/react';

export function useLiveViewer(options: Parameters<typeof useTeardownViewer>[0]) {
  return useTeardownViewer(options);
}

export interface LiveViewerProps {
  readonly project: ViewerProject;
  readonly initial?: 'imploded' | 'exploded';
  readonly viewer?: TeardownViewerHandle;
  readonly panels?: ViewerPanelsHandle;
  readonly registry?: ComponentProps<typeof TeardownViewer>['registry'];
  readonly fallback?: ReactNode;
  readonly onFirstFrame?: () => void;
  readonly className?: string;
  readonly 'aria-label'?: string;
}

interface LiveViewerSurfaceProps extends LiveViewerProps {
  readonly viewer: TeardownViewerHandle;
}

function LiveViewerSurface({
  project,
  viewer,
  panels,
  registry,
  fallback,
  onFirstFrame,
  className,
  'aria-label': ariaLabel,
}: LiveViewerSurfaceProps) {
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

function LiveViewerOwned(props: LiveViewerProps) {
  const viewer = useTeardownViewer({ initial: props.initial, project: props.project });

  return <LiveViewerSurface {...props} viewer={viewer} />;
}

export function LiveViewer(props: LiveViewerProps) {
  return props.viewer === undefined ? (
    <LiveViewerOwned {...props} />
  ) : (
    <LiveViewerSurface {...props} viewer={props.viewer} />
  );
}
