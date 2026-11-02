import { inflateSync } from 'node:zlib';

// @ts-expect-error jsdom does not ship its own TypeScript declarations.
import { JSDOM } from 'jsdom';
import { blueprint } from 'xploder/theme';
import { describe, expect, test } from 'vitest';

import { appleIconElement, iconSvg } from '../seo/icon';
import { renderPng } from '../seo/og/render';

const PNG_SIGNATURE = '89504e470d0a1a0a';

interface DecodedPixel {
  readonly width: number;
  readonly height: number;
  readonly red: number;
  readonly green: number;
  readonly blue: number;
  readonly alpha: number;
}

function paeth(left: number, up: number, upperLeft: number): number {
  const estimate = left + up - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upperLeftDistance = Math.abs(estimate - upperLeft);

  if (leftDistance <= upDistance && leftDistance <= upperLeftDistance) return left;
  if (upDistance <= upperLeftDistance) return up;

  return upperLeft;
}

function decodePixel(bytes: Uint8Array, sampleX: number, sampleY: number): DecodedPixel {
  const png = Buffer.from(bytes);

  expect(png.subarray(0, 8).toString('hex')).toBe(PNG_SIGNATURE);

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const imageData: Buffer[] = [];

  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.subarray(offset + 4, offset + 8).toString('ascii');
    const data = png.subarray(offset + 8, offset + 8 + length);

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8] ?? 0;
      colorType = data[9] ?? 0;
      interlace = data[12] ?? 0;
    } else if (type === 'IDAT') {
      imageData.push(data);
    } else if (type === 'IEND') {
      break;
    }

    offset += length + 12;
  }

  expect(bitDepth).toBe(8);
  expect(interlace).toBe(0);
  expect([2, 6]).toContain(colorType);

  const channelCount = colorType === 6 ? 4 : 3;
  const rowBytes = width * channelCount;
  const inflated = inflateSync(Buffer.concat(imageData));
  let previous = Buffer.alloc(rowBytes);
  let current = Buffer.alloc(rowBytes);

  for (let row = 0; row <= sampleY; row += 1) {
    const rowOffset = row * (rowBytes + 1);
    const filter = inflated[rowOffset] ?? 0;

    for (let index = 0; index < rowBytes; index += 1) {
      const value = inflated[rowOffset + index + 1] ?? 0;
      const left = index >= channelCount ? (current[index - channelCount] ?? 0) : 0;
      const up = previous[index] ?? 0;
      const upperLeft = index >= channelCount ? (previous[index - channelCount] ?? 0) : 0;

      switch (filter) {
        case 0:
          current[index] = value;
          break;
        case 1:
          current[index] = (value + left) & 0xff;
          break;
        case 2:
          current[index] = (value + up) & 0xff;
          break;
        case 3:
          current[index] = (value + Math.floor((left + up) / 2)) & 0xff;
          break;
        case 4:
          current[index] = (value + paeth(left, up, upperLeft)) & 0xff;
          break;
        default:
          throw new Error(`Unsupported PNG row filter ${String(filter)}`);
      }
    }

    [previous, current] = [current, previous];
  }

  const pixelOffset = sampleX * channelCount;

  return {
    width,
    height,
    red: previous[pixelOffset] ?? -1,
    green: previous[pixelOffset + 1] ?? -1,
    blue: previous[pixelOffset + 2] ?? -1,
    alpha: channelCount === 4 ? (previous[pixelOffset + 3] ?? -1) : 255,
  };
}

function rgb(hex: string): { red: number; green: number; blue: number } {
  return {
    red: Number.parseInt(hex.slice(1, 3), 16),
    green: Number.parseInt(hex.slice(3, 5), 16),
    blue: Number.parseInt(hex.slice(5, 7), 16),
  };
}

describe('SEO icon', () => {
  test('iconSvg parses as SVG and uses only blueprint palette colours', () => {
    const svg = iconSvg();
    const document = new JSDOM(svg, { contentType: 'image/svg+xml' }).window.document;
    const style = document.querySelector('style')?.textContent ?? '';
    const palette = new Set(
      [blueprint.light, blueprint.dark].flatMap((entry) => [
        entry.paper,
        entry.line,
        entry.lineMuted,
        entry.accent,
      ]),
    );
    const colours = [...style.matchAll(/#[0-9a-fA-F]{6}\b/g)].map((match) => match[0]);

    expect(document.querySelector('parsererror')).toBeNull();
    expect(document.documentElement.tagName.toLowerCase()).toBe('svg');
    expect(colours.length).toBeGreaterThan(0);
    expect(colours.filter((colour) => !palette.has(colour))).toEqual([]);
    expect(colours).toEqual(
      expect.arrayContaining([
        blueprint.light.paper,
        blueprint.light.line,
        blueprint.light.lineMuted,
        blueprint.light.accent,
        blueprint.dark.paper,
        blueprint.dark.line,
        blueprint.dark.lineMuted,
        blueprint.dark.accent,
      ]),
    );
  });

  test('iconSvg carries a dark prefers-color-scheme block', () => {
    expect(iconSvg()).toMatch(/@media\s*\(prefers-color-scheme:\s*dark\)/);
  });

  test('apple icon renders a 180x180 PNG on an opaque paper ground', async () => {
    const bytes = await renderPng(appleIconElement(), { width: 180, height: 180 });
    const pixel = decodePixel(bytes, 36, 36);
    const paper = rgb(blueprint.light.paper);

    expect({ width: pixel.width, height: pixel.height }).toEqual({ width: 180, height: 180 });
    expect({ red: pixel.red, green: pixel.green, blue: pixel.blue }).toEqual(paper);
    expect(pixel.alpha).toBe(255);
  });
});
