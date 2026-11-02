// Shared by the server page (poster) and the client island (live layer): a plain module, not 'use client'.
export const LIVE_CLASS =
  'peer absolute inset-0 opacity-0 data-[site-live-state=revealed]:opacity-100 [transition-property:opacity] [transition-duration:var(--motion-duration-panel-enter)] [transition-timing-function:var(--motion-ease-panel-enter)]';
export const POSTER_FADE_CLASS =
  'peer-data-[site-live-state=revealed]:opacity-0 absolute inset-0 h-full w-full opacity-100 [transition-property:opacity] [transition-duration:var(--motion-duration-panel-enter)] [transition-timing-function:var(--motion-ease-panel-enter)]';
