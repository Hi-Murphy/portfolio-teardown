'use client';

import { useEffect, useRef } from 'react';

import { NextIcon, PauseIcon, PlayIcon, PreviousIcon, RestartIcon } from './workbench-dock';
import { findTourFlow, tourStepAt, type TourFlow, type TourModelStatus } from './tour-model';

const FLOW_CHOOSER =
  'grid grid-cols-1 gap-1.5 rounded border border-line/40 bg-bg/60 p-1.5 sm:grid-cols-2';
const FLOW_HEADER = 'min-w-0 rounded border border-line/40 bg-bg/60 px-2 py-1.5';
const FLOW_BUTTON =
  'min-w-0 rounded border px-2 py-1.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';
const FLOW_BUTTON_SELECTED =
  'border-accent bg-accent/10 text-fg active:border-accent active:bg-accent/20';
const FLOW_BUTTON_IDLE =
  'border-transparent text-fg hover:border-line hover:bg-surface active:border-accent active:bg-surface';
const TRANSPORT_BUTTON =
  'inline-flex h-11 shrink-0 items-center justify-center rounded border border-line/60 bg-bg text-fg hover:border-accent hover:bg-surface hover:text-accent active:border-accent active:bg-surface active:text-accent disabled:cursor-not-allowed disabled:border-line/30 disabled:text-muted disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';
const TRANSPORT_ICON = `${TRANSPORT_BUTTON} w-11`;
const TRANSPORT_PRIMARY =
  'inline-flex h-14 min-w-[4.25rem] shrink-0 items-center justify-center gap-1 rounded border border-accent bg-accent px-2 text-xs font-semibold text-bg hover:border-fg hover:bg-accent/90 active:border-fg active:bg-accent/80 disabled:cursor-not-allowed disabled:border-line/30 disabled:bg-surface disabled:text-muted disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:min-w-[6rem] sm:gap-1.5 sm:px-4 sm:text-sm';
const CHIP =
  'inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-3 font-mono text-[0.6875rem] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';
const CHIP_SELECTED = 'border-accent bg-accent text-bg';
const CHIP_IDLE = 'border-line/60 bg-bg text-fg hover:border-accent hover:text-accent';

function ExitTourIcon() {
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
      <path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9" />
    </svg>
  );
}

function FlowText({ flow }: { readonly flow: TourFlow }) {
  return (
    <>
      <span className="flex min-w-0 items-baseline gap-2">
        <span
          data-site-tour-flow-title=""
          className="min-w-0 truncate text-xs font-semibold text-fg"
        >
          {flow.title}
        </span>
        <span
          data-site-tour-flow-count=""
          className="shrink-0 font-mono text-[0.625rem] text-muted"
        >
          {`${flow.steps.length} steps`}
        </span>
      </span>
      <span
        data-site-tour-flow-description=""
        className="mt-0.5 line-clamp-2 text-[0.6875rem] leading-snug text-muted"
      >
        {flow.description}
      </span>
    </>
  );
}

export interface TourPanelProps {
  readonly flows: readonly TourFlow[];
  readonly flowId: string | null;
  readonly status: TourModelStatus;
  readonly step: number;
  readonly onSelectFlow: (flowId: string) => void;
  readonly onTogglePlayback: () => void;
  readonly onPrevious: () => void;
  readonly onNext: () => void;
  readonly onRestart: () => void;
  readonly onExit: () => void;
  readonly onJump: (stepIndex: number) => void;
  readonly onHighlight: (componentId: string | null) => void;
}

export function TourPanel({
  flows,
  flowId,
  status,
  step,
  onSelectFlow,
  onTogglePlayback,
  onPrevious,
  onNext,
  onRestart,
  onExit,
  onJump,
  onHighlight,
}: TourPanelProps) {
  const flow = findTourFlow(flows, flowId);
  const current = status === 'idle' ? undefined : tourStepAt(flow, step);
  const total = flow?.steps.length ?? 0;
  const currentChipRef = useRef<HTMLButtonElement>(null);
  const playing = status === 'playing';
  const playbackLabel = playing ? 'Pause' : status === 'paused' ? 'Resume' : 'Start';
  const playbackAria =
    status === 'playing' ? 'Pause tour' : status === 'paused' ? 'Resume tour' : 'Start tour';
  const position = current === undefined ? 0 : current.index + 1;

  useEffect(() => {
    currentChipRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [current?.id, step]);

  return (
    <div data-site-tour-panel="" className="flex h-full min-w-0 flex-col gap-1 p-2">
      <p className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-muted">
        Guided tour
      </p>

      {flows.length === 1 && flows[0] !== undefined ? (
        <div data-site-tour-flow-header="" className={FLOW_HEADER}>
          <FlowText flow={flows[0]} />
        </div>
      ) : (
        <div role="group" aria-label="Tour flow" className={FLOW_CHOOSER}>
          {flows.map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              data-site-control={`flow-${candidate.id}`}
              data-site-tour-flow-option={candidate.id}
              aria-pressed={flowId === candidate.id}
              className={`${FLOW_BUTTON} ${
                flowId === candidate.id ? FLOW_BUTTON_SELECTED : FLOW_BUTTON_IDLE
              }`}
              onClick={() => onSelectFlow(candidate.id)}
            >
              <FlowText flow={candidate} />
            </button>
          ))}
        </div>
      )}

      <div
        data-site-tour-transport-region=""
        className="flex h-[4.75rem] shrink-0 flex-col items-center justify-start gap-0.5"
      >
        <div
          data-site-tour-transport=""
          className="flex w-fit max-w-full items-center justify-center gap-0.5 sm:gap-2"
        >
          <button
            type="button"
            data-site-control="tour-restart"
            aria-label="Restart tour"
            title="Restart tour"
            disabled={status === 'idle' || total === 0}
            className={TRANSPORT_ICON}
            onClick={onRestart}
          >
            <RestartIcon />
          </button>
          <button
            type="button"
            data-site-control="tour-prev"
            aria-label="Previous step"
            title="Previous step"
            disabled={status === 'idle' || step <= 0}
            className={TRANSPORT_ICON}
            onClick={onPrevious}
          >
            <PreviousIcon />
          </button>
          <button
            type="button"
            data-site-control="tour-play"
            aria-label={playbackAria}
            title={playbackAria}
            aria-pressed={playing}
            disabled={flows.length === 0}
            className={TRANSPORT_PRIMARY}
            onClick={onTogglePlayback}
          >
            {playing ? <PauseIcon /> : <PlayIcon />}
            <span>{playbackLabel}</span>
          </button>
          <button
            type="button"
            data-site-control="tour-next"
            aria-label="Next step"
            title="Next step"
            disabled={total === 0 || step >= total - 1}
            className={TRANSPORT_ICON}
            onClick={onNext}
          >
            <NextIcon />
          </button>
          {status === 'idle' ? null : (
            <button
              type="button"
              data-site-control="tour-exit"
              aria-label="Exit tour"
              title="Exit tour"
              className={`${TRANSPORT_BUTTON} gap-1 px-1.5 text-[0.625rem] font-semibold sm:gap-1.5 sm:px-2.5 sm:text-xs`}
              onClick={onExit}
            >
              <ExitTourIcon />
              <span>Exit tour</span>
            </button>
          )}
        </div>
        <p
          data-site-tour-position=""
          aria-live="polite"
          className="h-4 shrink-0 font-mono text-[0.6875rem] leading-4 text-muted"
        >
          {`Step ${position} of ${total}`}
        </p>
      </div>

      <div className="h-11 min-w-0 overflow-x-auto overflow-y-hidden">
        <ol role="list" aria-label="Tour steps" className="flex h-11 w-max items-center gap-1.5">
          {(flow?.steps ?? []).map((candidate) => {
            const selected = current?.index === candidate.index;

            return (
              <li key={`${candidate.id}-${candidate.index}`} className="shrink-0">
                <button
                  ref={selected ? currentChipRef : undefined}
                  type="button"
                  data-site-tour-chip={candidate.id}
                  data-site-tour-index={candidate.index}
                  aria-current={selected ? 'step' : undefined}
                  title={`Step ${candidate.index + 1}: ${candidate.name}`}
                  className={`${CHIP} ${selected ? CHIP_SELECTED : CHIP_IDLE}`}
                  onClick={() => onJump(candidate.index)}
                  onMouseEnter={() => onHighlight(candidate.id)}
                  onMouseLeave={() => onHighlight(null)}
                  onFocus={() => onHighlight(candidate.id)}
                  onBlur={() => onHighlight(null)}
                >
                  <span className={selected ? 'text-bg' : 'text-muted'}>{candidate.index + 1}</span>
                  <span className="text-current">{candidate.name}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded border border-line/30 bg-bg/60 px-2.5 py-1">
        <p className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-muted">Now</p>
        <p
          data-site-tour-now=""
          aria-live="polite"
          className="mt-0.5 line-clamp-2 text-xs leading-snug"
        >
          {current === undefined ? (
            <span className="text-muted">Start the tour to walk the selected flow.</span>
          ) : (
            <>
              <span className="font-semibold text-fg">{current.name}</span>
              {current.summary === '' ? null : (
                <span className="text-muted">{` — ${current.summary}`}</span>
              )}
            </>
          )}
        </p>
      </div>
    </div>
  );
}
