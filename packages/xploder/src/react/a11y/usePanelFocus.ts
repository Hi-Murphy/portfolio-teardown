import { useLayoutEffect, useRef, type RefObject } from 'react';

export interface UsePanelFocusOptions {
  readonly surfaceRef: RefObject<HTMLElement | null>;
  readonly surfaceKey: string | null;
  readonly headingRef: RefObject<HTMLHeadingElement | null>;
  readonly visible: boolean;
  readonly kind: 'detail' | 'caseStudy' | null;
}

function activeElementInside(element: HTMLElement | null): boolean {
  if (element === null || typeof document === 'undefined') return false;

  const active = document.activeElement;
  return active instanceof Node && element.contains(active);
}

function headingFor(
  surface: HTMLElement | null,
  headingRef: RefObject<HTMLHeadingElement | null>,
): HTMLElement | null {
  const heading = headingRef.current;

  if (heading !== null && heading.isConnected) return heading;
  return surface?.querySelector<HTMLElement>('h2') ?? null;
}

export function usePanelFocus({
  surfaceRef,
  surfaceKey,
  headingRef,
  visible,
  kind,
}: UsePanelFocusOptions): void {
  const previousKeyRef = useRef<string | null>(null);
  const previousVisibleRef = useRef(false);
  const focusInsideRef = useRef(false);
  const focusBeforeHideRef = useRef(false);
  const focusInsideAtRender = activeElementInside(surfaceRef.current);

  useLayoutEffect(() => {
    const onFocusIn = (event: FocusEvent) => {
      if (event.target instanceof Node && surfaceRef.current?.contains(event.target) === true) {
        focusInsideRef.current = true;
      } else if (event.target === document.body) {
        return;
      } else {
        focusInsideRef.current = false;
      }
    };

    document.addEventListener('focusin', onFocusIn);

    return () => {
      document.removeEventListener('focusin', onFocusIn);
    };
  }, [surfaceRef]);

  useLayoutEffect(() => {
    const previousKey = previousKeyRef.current;
    const previousVisible = previousVisibleRef.current;
    const active = typeof document === 'undefined' ? null : document.activeElement;
    const focusWasInside =
      focusInsideRef.current || focusInsideAtRender || activeElementInside(surfaceRef.current);
    let shouldFocus = false;

    if (surfaceKey !== null) {
      if (previousKey === null) {
        shouldFocus = kind !== 'caseStudy';
      } else if (surfaceKey !== previousKey) {
        shouldFocus = focusWasInside;
      } else if (visible && !previousVisible) {
        shouldFocus =
          focusBeforeHideRef.current ||
          focusWasInside ||
          (kind !== 'caseStudy' && (active === null || active === document.body));
      }
    }

    if (previousVisible && !visible) focusBeforeHideRef.current = focusWasInside;

    if (shouldFocus) {
      const heading = headingFor(surfaceRef.current, headingRef);

      heading?.focus({ preventScroll: true });
      focusBeforeHideRef.current = false;
    }

    previousKeyRef.current = surfaceKey;
    previousVisibleRef.current = visible;
  }, [focusInsideAtRender, headingRef, kind, surfaceKey, surfaceRef, visible]);
}
