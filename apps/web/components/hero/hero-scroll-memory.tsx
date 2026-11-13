'use client';

import { useEffect } from 'react';

let lastHomeScrollY = 0;
let restoreOnMount = false;
let traversalPath: string | null = null;
let traversalListenerInstalled = false;

function installTraversalListener(): void {
  if (traversalListenerInstalled) return;
  traversalListenerInstalled = true;

  window.addEventListener('popstate', () => {
    traversalPath = window.location.pathname;
    if (traversalPath === '/') {
      restoreOnMount = true;
      window.history.scrollRestoration = 'manual';
    } else {
      window.history.scrollRestoration = 'auto';
    }
  });
}

export function HeroScrollMemory() {
  useEffect(() => {
    installTraversalListener();

    const shouldRestore = restoreOnMount;
    restoreOnMount = false;
    traversalPath = null;
    window.history.scrollRestoration = 'manual';

    let restored = !shouldRestore;
    let navigationStarted = false;
    let firstFrame = 0;
    let secondFrame = 0;
    const remember = (): void => {
      if (restored && !navigationStarted) lastHomeScrollY = window.scrollY;
    };
    const rememberBeforeNavigation = (event: MouseEvent): void => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        !(event.target instanceof Element)
      ) {
        return;
      }

      const link = event.target.closest<HTMLAnchorElement>('a[href]');
      if (link === null || link.target === '_blank') return;
      const destination = new URL(link.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      if (
        `${destination.pathname}${destination.search}` ===
        `${window.location.pathname}${window.location.search}`
      ) {
        return;
      }

      lastHomeScrollY = window.scrollY;
      navigationStarted = true;
      window.history.scrollRestoration = 'manual';
    };

    if (shouldRestore) {
      firstFrame = window.requestAnimationFrame(() => {
        secondFrame = window.requestAnimationFrame(() => {
          window.scrollTo(0, lastHomeScrollY);
          restored = true;
          window.history.scrollRestoration = 'auto';
        });
      });
    } else {
      window.history.scrollRestoration = 'auto';
      remember();
    }

    window.addEventListener('scroll', remember, { passive: true });
    document.addEventListener('click', rememberBeforeNavigation, true);

    return () => {
      window.removeEventListener('scroll', remember);
      document.removeEventListener('click', rememberBeforeNavigation, true);
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      if (restored && !navigationStarted) lastHomeScrollY = window.scrollY;
      window.history.scrollRestoration =
        traversalPath === null || traversalPath === '/' ? 'manual' : 'auto';
    };
  }, []);

  return null;
}
