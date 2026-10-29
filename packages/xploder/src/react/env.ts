import { reducedMotion } from '../motion';

export type ThemeMode = 'light' | 'dark';

export interface ThemeEnv {
  readonly root: HTMLElement;
  readonly matchMedia: (query: string) => MediaQueryList;
  readonly MutationObserver: typeof MutationObserver;
}

export interface MotionEnv {
  readonly matchMedia: (query: string) => MediaQueryList;
}

const DARK_QUERY = '(prefers-color-scheme: dark)';

export function resolveThemeMode(state: {
  hasDarkClass: boolean;
  hasLightClass: boolean;
  prefersDark: boolean;
}): ThemeMode {
  if (state.hasDarkClass) return 'dark';
  if (state.prefersDark && !state.hasLightClass) return 'dark';
  return 'light';
}

export function themeMode(env: ThemeEnv): ThemeMode {
  return resolveThemeMode({
    hasDarkClass: env.root.classList.contains('dark'),
    hasLightClass: env.root.classList.contains('light'),
    prefersDark: env.matchMedia(DARK_QUERY).matches,
  });
}

export function subscribeTheme(env: ThemeEnv, callback: (mode: ThemeMode) => void): () => void {
  const media = env.matchMedia(DARK_QUERY);

  function notify(): void {
    callback(themeMode(env));
  }

  callback(themeMode(env));
  media.addEventListener('change', notify);

  const observer = new env.MutationObserver(notify);
  observer.observe(env.root, { attributes: true, attributeFilter: ['class'] });

  return () => {
    media.removeEventListener('change', notify);
    observer.disconnect();
  };
}

export function subscribeReducedMotion(
  env: MotionEnv,
  callback: (reduced: boolean) => void,
): () => void {
  const media = env.matchMedia(reducedMotion.query);

  function notify(): void {
    callback(media.matches);
  }

  callback(media.matches);
  media.addEventListener('change', notify);

  return () => media.removeEventListener('change', notify);
}
