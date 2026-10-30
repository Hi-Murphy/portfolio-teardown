import { describe, expect, test } from 'vitest';

import { emphasis } from '../src/motion/emphasis';
import { blueprint, type PaletteRole } from '../src/theme';

const THEMES = ['light', 'dark'] as const;
const EMPHASIS_ROLES: readonly PaletteRole[] = [emphasis.highlight.role, emphasis.dim.toward];

function rgbChannels(colour: string): readonly [number, number, number] {
  const match = /^#([0-9A-F]{2})([0-9A-F]{2})([0-9A-F]{2})$/i.exec(colour);
  const red = match?.[1];
  const green = match?.[2];
  const blue = match?.[3];

  if (!red || !green || !blue) throw new Error(`Invalid RGB colour: ${colour}`);

  return [Number.parseInt(red, 16), Number.parseInt(green, 16), Number.parseInt(blue, 16)];
}

describe('emphasis tokens', () => {
  test('matches the RFC 9.1 values', () => {
    expect(emphasis).toEqual({
      highlight: { role: 'accent' },
      dim: { level: 0.3, toward: 'paper' },
      tourPulse: { floor: 0.6 },
    });
  });

  test('uses palette roles present in both themes', () => {
    for (const theme of THEMES) {
      for (const role of EMPHASIS_ROLES) {
        expect(Object.hasOwn(blueprint[theme], role), `${theme}.${role}`).toBe(true);
      }
    }
  });

  test('keeps dim and pulse levels inside the open unit interval', () => {
    expect(emphasis.dim.level).toBeGreaterThan(0);
    expect(emphasis.dim.level).toBeLessThan(1);
    expect(emphasis.tourPulse.floor).toBeGreaterThan(0);
    expect(emphasis.tourPulse.floor).toBeLessThan(1);
  });

  test('keeps every line multiplier channel nonzero in both themes', () => {
    for (const theme of THEMES) {
      for (const role of ['line', 'lineMuted'] as const) {
        const channels = rgbChannels(blueprint[theme][role]);

        for (const channel of channels) {
          expect(channel, `${theme}.${role}`).toBeGreaterThan(0);
        }
      }
    }
  });
});
