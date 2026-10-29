import { useCallback, useSyncExternalStore } from 'react';

import { reducedMotion } from '../motion';
import { subscribeReducedMotion, type MotionEnv } from './env';

function browserMotionEnv(): MotionEnv {
  return { matchMedia: window.matchMedia.bind(window) };
}

function subscribe(onStoreChange: () => void): () => void {
  return subscribeReducedMotion(browserMotionEnv(), onStoreChange);
}

function getSnapshot(): boolean {
  return window.matchMedia(reducedMotion.query).matches;
}

function getServerSnapshot(): boolean {
  return false;
}

export function usePrefersReducedMotion(): boolean {
  const stableSubscribe = useCallback(subscribe, []);
  return useSyncExternalStore(stableSubscribe, getSnapshot, getServerSnapshot);
}
