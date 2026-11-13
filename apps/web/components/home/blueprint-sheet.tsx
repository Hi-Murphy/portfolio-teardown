import type { CSSProperties } from 'react';

const GRID_STYLE = {
  backgroundImage:
    'linear-gradient(to right, var(--color-grid) 1px, transparent 1px), linear-gradient(to bottom, var(--color-grid) 1px, transparent 1px)',
  backgroundSize: '24px 24px',
  maskImage: 'radial-gradient(ellipse 78% 82% at 68% 45%, var(--color-grid) 40%, transparent 92%)',
  WebkitMaskImage:
    'radial-gradient(ellipse 78% 82% at 68% 45%, var(--color-grid) 40%, transparent 92%)',
} satisfies CSSProperties;

const CROP_MARK_CLASS = 'absolute h-[18px] w-[18px] border-line/70';

export function BlueprintSheet() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-2.5 bottom-3 top-2 sm:inset-x-6 sm:bottom-4 lg:inset-x-8"
    >
      <span className="absolute inset-0" style={GRID_STYLE} />
      <span className={`${CROP_MARK_CLASS} left-0 top-0 border-l border-t`} />
      <span className={`${CROP_MARK_CLASS} right-0 top-0 border-r border-t`} />
      <span className={`${CROP_MARK_CLASS} bottom-0 left-0 border-b border-l`} />
      <span className={`${CROP_MARK_CLASS} bottom-0 right-0 border-b border-r`} />
    </div>
  );
}
