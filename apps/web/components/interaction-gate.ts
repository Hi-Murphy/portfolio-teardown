type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void) => number;
  cancelIdleCallback?: (handle: number) => void;
};

const INTERACTION_EVENTS = [
  'pointermove',
  'pointerdown',
  'touchstart',
  'wheel',
  'scroll',
  'keydown',
  'focusin',
] as const;

export function waitForFirstInteraction(
  signal: AbortSignal,
  shouldIgnore?: (event: Event) => boolean,
): Promise<boolean> {
  if (signal.aborted) return Promise.resolve(false);

  return new Promise((resolve) => {
    const finish = (result: boolean) => {
      for (const type of INTERACTION_EVENTS) window.removeEventListener(type, onInteract, true);
      signal.removeEventListener('abort', abort);
      resolve(result);
    };
    const onInteract = (event: Event) => {
      if (shouldIgnore?.(event) === true) return;
      finish(true);
    };
    const abort = () => finish(false);

    for (const type of INTERACTION_EVENTS) {
      window.addEventListener(type, onInteract, { capture: true, passive: true });
    }
    signal.addEventListener('abort', abort, { once: true });
  });
}

export function waitForIdle(signal: AbortSignal): Promise<boolean> {
  if (signal.aborted) return Promise.resolve(false);

  return new Promise((resolve) => {
    const idleWindow = window as IdleWindow;
    let cancel: () => void = () => undefined;
    const finish = (result: boolean) => {
      signal.removeEventListener('abort', abort);
      cancel();
      resolve(result);
    };
    const abort = () => finish(false);

    signal.addEventListener('abort', abort, { once: true });

    if (idleWindow.requestIdleCallback !== undefined) {
      const handle = idleWindow.requestIdleCallback(() => finish(true));
      cancel = () => {
        idleWindow.cancelIdleCallback?.(handle);
      };
    } else {
      const handle = window.requestAnimationFrame(() => finish(true));
      cancel = () => {
        window.cancelAnimationFrame(handle);
      };
    }
  });
}
