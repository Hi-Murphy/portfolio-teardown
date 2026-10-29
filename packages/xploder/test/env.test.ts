import { describe, expect, test } from 'vitest';

import { resolveThemeMode, subscribeReducedMotion, subscribeTheme } from '../src/react/env';

class FakeMediaQueryList {
  matches: boolean;
  readonly listeners = new Set<() => void>();

  constructor(matches: boolean) {
    this.matches = matches;
  }

  addEventListener(type: string, listener: () => void): void {
    if (type === 'change') this.listeners.add(listener);
  }

  removeEventListener(type: string, listener: () => void): void {
    if (type === 'change') this.listeners.delete(listener);
  }

  setMatches(matches: boolean): void {
    this.matches = matches;
    for (const listener of this.listeners) listener();
  }
}

class FakeMutationObserver {
  static current: FakeMutationObserver | null = null;

  readonly callback: () => void;
  disconnected = false;
  observed = false;

  constructor(callback: () => void) {
    this.callback = callback;
    FakeMutationObserver.current = this;
  }

  observe(): void {
    this.observed = true;
  }

  disconnect(): void {
    this.disconnected = true;
  }

  trigger(): void {
    if (!this.disconnected) this.callback();
  }
}

function fakeRoot(classes: Set<string>): HTMLElement {
  return {
    classList: {
      contains(name: string): boolean {
        return classes.has(name);
      },
    },
  } as unknown as HTMLElement;
}

describe('resolveThemeMode', () => {
  test.each([
    [false, false, false, 'light'],
    [false, false, true, 'dark'],
    [false, true, false, 'light'],
    [false, true, true, 'light'],
    [true, false, false, 'dark'],
    [true, false, true, 'dark'],
    [true, true, false, 'dark'],
    [true, true, true, 'dark'],
  ] as const)(
    'dark=%s light=%s prefersDark=%s resolves %s',
    (hasDarkClass, hasLightClass, prefersDark, expected) => {
      expect(resolveThemeMode({ hasDarkClass, hasLightClass, prefersDark })).toBe(expected);
    },
  );
});

describe('subscribeTheme', () => {
  test('calls initially, follows theme changes, and removes its listeners', () => {
    const media = new FakeMediaQueryList(false);
    const classes = new Set<string>();
    const root = fakeRoot(classes);
    const modes: string[] = [];
    const env = {
      root,
      matchMedia: () => media as unknown as MediaQueryList,
      MutationObserver: FakeMutationObserver as unknown as typeof MutationObserver,
    };
    const unsubscribe = subscribeTheme(env, (mode) => modes.push(mode));
    const observer = FakeMutationObserver.current;

    expect(modes).toEqual(['light']);
    expect(observer?.observed).toBe(true);

    classes.add('dark');
    observer?.trigger();
    expect(modes.at(-1)).toBe('dark');

    classes.clear();
    media.setMatches(true);
    expect(modes.at(-1)).toBe('dark');

    classes.add('light');
    observer?.trigger();
    expect(modes.at(-1)).toBe('light');

    const count = modes.length;
    unsubscribe();
    expect(media.listeners.size).toBe(0);
    expect(observer?.disconnected).toBe(true);
    media.setMatches(false);
    observer?.trigger();
    expect(modes).toHaveLength(count);
  });
});

describe('subscribeReducedMotion', () => {
  test('calls initially, follows changes, and removes its listener', () => {
    const media = new FakeMediaQueryList(true);
    const values: boolean[] = [];
    const unsubscribe = subscribeReducedMotion(
      { matchMedia: () => media as unknown as MediaQueryList },
      (reduced) => values.push(reduced),
    );

    expect(values).toEqual([true]);

    media.setMatches(false);
    expect(values).toEqual([true, false]);

    unsubscribe();
    expect(media.listeners.size).toBe(0);
    media.setMatches(true);
    expect(values).toEqual([true, false]);
  });
});
