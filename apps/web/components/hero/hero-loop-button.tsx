'use client';

export interface HeroLoopLabels {
  readonly pause: string;
  readonly play: string;
}

export interface HeroLoopButtonProps {
  readonly paused: boolean;
  readonly labels: HeroLoopLabels;
  readonly onToggle: () => void;
}

const BUTTON_CLASS =
  'inline-flex h-11 w-11 items-center justify-center rounded-full border border-line/35 text-fg hover:border-line hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

export function HeroLoopButton({ paused, labels, onToggle }: HeroLoopButtonProps) {
  return (
    <button
      type="button"
      aria-label={paused ? labels.play : labels.pause}
      className={BUTTON_CLASS}
      onClick={onToggle}
    >
      {paused ? (
        <svg
          aria-hidden="true"
          focusable="false"
          viewBox="0 0 16 16"
          className="h-4 w-4"
          fill="currentColor"
        >
          <path d="M5 3.5v9l7-4.5-7-4.5Z" />
        </svg>
      ) : (
        <svg
          aria-hidden="true"
          focusable="false"
          viewBox="0 0 16 16"
          className="h-4 w-4"
          fill="currentColor"
        >
          <rect x="4" y="3" width="3" height="10" rx="0.5" />
          <rect x="9" y="3" width="3" height="10" rx="0.5" />
        </svg>
      )}
    </button>
  );
}
