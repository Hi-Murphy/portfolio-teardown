import { deflateSync } from 'node:zlib';

import { describe, expect, test } from 'vitest';

import { decodePng, encodeRgbaPng } from '../src/png.ts';

interface Pixel {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

const PIXELS: readonly Pixel[] = [
  { r: 10, g: 20, b: 30, a: 40 },
  { r: 50, g: 60, b: 70, a: 80 },
  { r: 90, g: 100, b: 110, a: 120 },
  { r: 130, g: 140, b: 150, a: 160 },
  { r: 170, g: 180, b: 190, a: 200 },
  { r: 210, g: 220, b: 230, a: 240 },
  { r: 1, g: 2, b: 3, a: 4 },
  { r: 5, g: 6, b: 7, a: 8 },
  { r: 9, g: 10, b: 11, a: 12 },
];
const WIDTH = 3;
const HEIGHT = 3;

function crc32(data: Uint8Array): number {
  let value = 0xffffffff;
  for (const byte of data) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value >>> 1) ^ (0xedb88320 & -(value & 1));
    }
  }
  return (value ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Buffer {
  const typeBytes = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBytes, data]);
  const result = Buffer.alloc(data.byteLength + 12);
  result.writeUInt32BE(data.byteLength, 0);
  body.copy(result, 4);
  result.writeUInt32BE(crc32(body), data.byteLength + 8);
  return result;
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

function filteredByte(filter: number, value: number, left: number, up: number, upperLeft: number) {
  switch (filter) {
    case 0:
      return value;
    case 1:
      return value - left;
    case 2:
      return value - up;
    case 3:
      return value - Math.floor((left + up) / 2);
    case 4:
      return value - paeth(left, up, upperLeft);
    default:
      throw new Error(`unknown filter ${filter}`);
  }
}

function encodeFixture(colorType: 2 | 6, filter: number): Buffer {
  const pixelBytes = colorType === 2 ? 3 : 4;
  const rowBytes = WIDTH * pixelBytes;
  const stride = rowBytes + 1;
  const raw = Buffer.alloc(stride * HEIGHT);
  const source = Buffer.alloc(rowBytes * HEIGHT);

  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const pixel = PIXELS[y * WIDTH + x] as Pixel;
      const channels = [pixel.r, pixel.g, pixel.b, pixel.a];
      for (let channel = 0; channel < pixelBytes; channel += 1) {
        source[y * rowBytes + x * pixelBytes + channel] = channels[channel] as number;
      }
    }
  }

  for (let y = 0; y < HEIGHT; y += 1) {
    const rowOffset = y * stride;
    const sourceOffset = y * rowBytes;
    raw[rowOffset] = filter;
    for (let x = 0; x < WIDTH; x += 1) {
      for (let channel = 0; channel < pixelBytes; channel += 1) {
        const position = x * pixelBytes + channel;
        const target = rowOffset + 1 + position;
        const value = source[sourceOffset + position] as number;
        const left = x > 0 ? (source[sourceOffset + position - pixelBytes] as number) : 0;
        const up = y > 0 ? (source[sourceOffset - rowBytes + position] as number) : 0;
        const upperLeft =
          y > 0 && x > 0 ? (source[sourceOffset - rowBytes + position - pixelBytes] as number) : 0;
        raw[target] = filteredByte(filter, value, left, up, upperLeft) & 0xff;
      }
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(WIDTH, 0);
  ihdr.writeUInt32BE(HEIGHT, 4);
  ihdr[8] = 8;
  ihdr[9] = colorType;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function expectedRgba(colorType: 2 | 6): Uint8Array {
  const data = new Uint8Array(PIXELS.length * 4);
  for (let index = 0; index < PIXELS.length; index += 1) {
    const pixel = PIXELS[index] as Pixel;
    data[index * 4] = pixel.r;
    data[index * 4 + 1] = pixel.g;
    data[index * 4 + 2] = pixel.b;
    data[index * 4 + 3] = colorType === 6 ? pixel.a : 0xff;
  }
  return data;
}

describe('PNG decode', () => {
  test('decodes all five filters for RGB and RGBA', () => {
    for (const colorType of [2, 6] as const) {
      for (let filter = 0; filter <= 4; filter += 1) {
        const decoded = decodePng(encodeFixture(colorType, filter));
        expect(decoded.width).toBe(WIDTH);
        expect(decoded.height).toBe(HEIGHT);
        expect(Array.from(decoded.data)).toEqual(Array.from(expectedRgba(colorType)));
      }
    }
  });

  test('round-trips known pixels through the zlib encoder', () => {
    const image = {
      width: WIDTH,
      height: HEIGHT,
      data: expectedRgba(6),
    };

    const decoded = decodePng(encodeRgbaPng(image));

    expect(decoded).toEqual(image);
    expect(Array.from(decoded.data.slice(0, 4))).toEqual([10, 20, 30, 40]);
    expect(Array.from(decoded.data.slice(-4))).toEqual([9, 10, 11, 12]);
  });
});
