const SKIP_LINK_CLASS =
  'fixed left-3 top-3 z-50 inline-flex min-h-11 -translate-y-24 items-center rounded-sm border border-line bg-surface px-4 text-sm font-medium text-fg focus:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

export function SkipLink() {
  return (
    <a href="#main" className={SKIP_LINK_CLASS}>
      Skip to content
    </a>
  );
}
