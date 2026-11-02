'use client';

import type { ReactNode } from 'react';

interface GlyphProps {
  readonly children: ReactNode;
}

function Glyph({ children }: GlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="h-4 w-4 shrink-0"
    >
      {children}
    </svg>
  );
}

export function ExploreIcon() {
  return (
    <Glyph>
      <path d="M9 4H4v5M15 4h5v5M4 15v5h5M20 15v5h-5" />
      <path d="m9 9-5-5M15 9l5-5M9 15l-5 5M15 15l5 5" />
    </Glyph>
  );
}

export function CollapseIcon() {
  return (
    <Glyph>
      <path d="M4 9h5V4M20 9h-5V4M4 15h5v5M20 15h-5v5" />
      <path d="m9 9-5-5M15 9l5-5M9 15l-5 5M15 15l5 5" />
    </Glyph>
  );
}

export function RotateLeftIcon() {
  return (
    <Glyph>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </Glyph>
  );
}

export function RotateRightIcon() {
  return (
    <Glyph>
      <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
      <path d="M21 3v5h-5" />
    </Glyph>
  );
}

export function ZoomOutIcon() {
  return (
    <Glyph>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M7.5 10.5h6M20.5 20.5 15 15" />
    </Glyph>
  );
}

export function ZoomResetIcon() {
  return (
    <Glyph>
      <path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5" />
      <circle cx="12" cy="12" r="3" />
    </Glyph>
  );
}

export function ZoomInIcon() {
  return (
    <Glyph>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M7.5 10.5h6M10.5 7.5v6M20.5 20.5 15 15" />
    </Glyph>
  );
}

export function CaseStudyIcon() {
  return (
    <Glyph>
      <path d="M6 3h9l4 4v14H6z" />
      <path d="M14 3v5h5M9 12h6M9 16h6" />
    </Glyph>
  );
}

export function PlayIcon() {
  return (
    <Glyph>
      <path d="m8 5 11 7-11 7z" />
    </Glyph>
  );
}

export function PauseIcon() {
  return (
    <Glyph>
      <path d="M9 5v14M15 5v14" />
    </Glyph>
  );
}

export function PreviousIcon() {
  return (
    <Glyph>
      <path d="M6 5v14M18 6l-8 6 8 6z" />
    </Glyph>
  );
}

export function NextIcon() {
  return (
    <Glyph>
      <path d="M18 5v14M6 6l8 6-8 6z" />
    </Glyph>
  );
}

export function RestartIcon() {
  return (
    <Glyph>
      <path d="M4 12a8 8 0 1 0 2.7-6L4 8.5" />
      <path d="M4 4v4.5h4.5" />
    </Glyph>
  );
}

const PRIMARY_BASE =
  'inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded border px-3 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';
const PRIMARY_ACTIVE = 'border-accent bg-accent text-bg';
const PRIMARY_IDLE = 'border-line bg-bg text-fg hover:border-accent hover:text-accent';
const ICON_BUTTON =
  'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded border border-line/60 bg-bg text-fg hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:border-line/30 disabled:text-muted disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';
const ICON_SELECTED = 'border-accent bg-accent/10 text-accent';
const CONTROL_GROUP =
  'inline-flex shrink-0 items-center overflow-hidden rounded border border-line/60 bg-bg';
const GROUP_BUTTON =
  'inline-flex h-11 w-11 shrink-0 items-center justify-center border-l border-line/60 text-fg first:border-l-0 hover:bg-surface hover:text-accent disabled:cursor-not-allowed disabled:text-muted disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent';

export interface WorkbenchDockProps {
  readonly target: 'imploded' | 'exploded';
  readonly flowsActive: boolean;
  readonly can: {
    readonly zoomIn: boolean;
    readonly zoomOut: boolean;
    readonly zoomReset: boolean;
  };
  readonly caseStudyOpen: boolean;
  readonly caseStudyControlsId: string;
  readonly onToggle: () => void;
  readonly onRotateLeft: () => void;
  readonly onRotateRight: () => void;
  readonly onZoomOut: () => void;
  readonly onZoomReset: () => void;
  readonly onZoomIn: () => void;
  readonly onToggleCaseStudy: () => void;
}

export function WorkbenchDock({
  target,
  flowsActive,
  can,
  caseStudyOpen,
  caseStudyControlsId,
  onToggle,
  onRotateLeft,
  onRotateRight,
  onZoomOut,
  onZoomReset,
  onZoomIn,
  onToggleCaseStudy,
}: WorkbenchDockProps) {
  const exploded = target === 'exploded';
  const toggleLabel = exploded ? 'Implode teardown' : 'Explode teardown';
  const toggleTitle = flowsActive ? 'Switch to Layers to implode' : toggleLabel;

  return (
    <div
      data-site-dock-controls=""
      role="toolbar"
      aria-label="Viewer controls"
      className="grid h-full min-w-0 grid-cols-[minmax(0,1fr)_auto_auto] grid-rows-[2.75rem_2.75rem] gap-2 p-1.5 sm:flex sm:items-center sm:p-2"
    >
      <button
        type="button"
        data-site-control="toggle"
        aria-pressed={exploded}
        aria-label={toggleLabel}
        aria-describedby={flowsActive ? 'site-implode-hint' : undefined}
        title={toggleTitle}
        disabled={flowsActive}
        className={`${PRIMARY_BASE} ${exploded ? PRIMARY_ACTIVE : PRIMARY_IDLE} disabled:cursor-not-allowed disabled:border-line/30 disabled:bg-surface disabled:text-muted disabled:opacity-45`}
        onClick={onToggle}
      >
        {exploded ? <CollapseIcon /> : <ExploreIcon />}
        <span>{exploded ? 'Implode' : 'Explode'}</span>
      </button>
      {flowsActive ? (
        <span id="site-implode-hint" className="sr-only">
          Switch to Layers to implode
        </span>
      ) : null}

      <div role="group" aria-label="Rotate view" className={CONTROL_GROUP}>
        <button
          type="button"
          data-site-control="rotate-left"
          aria-label="Rotate left"
          title="Rotate left"
          className={GROUP_BUTTON}
          onClick={onRotateLeft}
        >
          <RotateLeftIcon />
        </button>
        <button
          type="button"
          data-site-control="rotate-right"
          aria-label="Rotate right"
          title="Rotate right"
          className={GROUP_BUTTON}
          onClick={onRotateRight}
        >
          <RotateRightIcon />
        </button>
      </div>

      <button
        type="button"
        data-site-control="case-study"
        aria-label="Case study"
        title="Case study"
        aria-expanded={caseStudyOpen}
        aria-controls={caseStudyControlsId}
        className={`${ICON_BUTTON} gap-2 sm:w-auto sm:px-3 ${caseStudyOpen ? ICON_SELECTED : ''}`}
        onClick={onToggleCaseStudy}
      >
        <CaseStudyIcon />
        <span aria-hidden="true" className="hidden text-sm font-medium sm:inline">
          Case study
        </span>
      </button>

      <div
        role="group"
        aria-label="Zoom view"
        className="col-span-3 inline-flex shrink-0 items-center gap-2 sm:col-auto"
      >
        <span
          aria-hidden="true"
          className="mr-1 hidden font-mono text-[0.625rem] uppercase tracking-[0.16em] text-muted min-[360px]:inline"
        >
          Zoom
        </span>
        <div className={CONTROL_GROUP}>
          <button
            type="button"
            data-site-control="zoom-out"
            aria-label="Zoom out"
            title="Zoom out"
            disabled={!can.zoomOut}
            className={GROUP_BUTTON}
            onClick={onZoomOut}
          >
            <ZoomOutIcon />
          </button>
          <button
            type="button"
            data-site-control="zoom-reset"
            aria-label="Reset zoom"
            title="Reset zoom"
            disabled={!can.zoomReset}
            className={GROUP_BUTTON}
            onClick={onZoomReset}
          >
            <ZoomResetIcon />
          </button>
          <button
            type="button"
            data-site-control="zoom-in"
            aria-label="Zoom in"
            title="Zoom in"
            disabled={!can.zoomIn}
            className={GROUP_BUTTON}
            onClick={onZoomIn}
          >
            <ZoomInIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
