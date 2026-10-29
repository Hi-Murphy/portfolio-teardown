import { useCallback, useSyncExternalStore } from 'react';

import { blueprint, type Palette } from '../theme';
import { subscribeTheme, themeMode, type ThemeEnv, type ThemeMode } from './env';

function browserThemeEnv(): ThemeEnv {
  return {
    root: document.documentElement,
    matchMedia: window.matchMedia.bind(window),
    MutationObserver: window.MutationObserver,
  };
}

function subscribe(onStoreChange: () => void): () => void {
  return subscribeTheme(browserThemeEnv(), onStoreChange);
}

function getSnapshot(): ThemeMode {
  return themeMode(browserThemeEnv());
}

function getServerSnapshot(): ThemeMode {
  return 'light';
}

export function useBlueprintPalette(): Palette {
  const stableSubscribe = useCallback(subscribe, []);
  const mode = useSyncExternalStore(stableSubscribe, getSnapshot, getServerSnapshot);

  return blueprint[mode];
}
