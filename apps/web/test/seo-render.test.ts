import { createHash } from 'node:crypto';

import { createElement, type CSSProperties } from 'react';
import { describe, expect, test } from 'vitest';
import { blueprint } from 'xploder/theme';

import { renderPng } from '../seo/og/render';

const WIDTH = 1200;
const HEIGHT = 630;
const SIZE_LIMIT_BYTES = 307_200;

function proofElement(text: string) {
  const pageStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: blueprint.light.paper,
  };
  const textStyle: CSSProperties = {
    color: blueprint.light.ink,
    fontFamily: 'IBM Plex Mono',
    fontSize: 64,
  };

  return createElement(
    'div',
    { style: pageStyle },
    createElement('div', { style: textStyle }, text),
  );
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function pngDimensions(bytes: Uint8Array): { width: number; height: number } {
  const png = Buffer.from(bytes);

  expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  expect(png.subarray(12, 16).toString('ascii')).toBe('IHDR');

  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

describe('OG renderer', () => {
  test('next/og renders deterministic 1200x630 PNG bytes', async () => {
    const element = proofElement('MONO 0123456789');
    const first = await renderPng(element, { width: WIDTH, height: HEIGHT });
    const second = await renderPng(element, { width: WIDTH, height: HEIGHT });
    const negative = await renderPng(proofElement('MONO 0123456788'), {
      width: WIDTH,
      height: HEIGHT,
    });

    const firstHash = sha256(first);
    const secondHash = sha256(second);
    const negativeHash = sha256(negative);
    const dimensions = pngDimensions(first);

    console.info(`renderer=next/og ImageResponse`);
    console.info(`first=sha256:${firstHash} bytes=${first.byteLength}`);
    console.info(`second=sha256:${secondHash} bytes=${second.byteLength}`);
    console.info(`dimensions=${dimensions.width}x${dimensions.height}`);
    console.info(`negative=sha256:${negativeHash} bytes=${negative.byteLength}`);

    expect(secondHash).toBe(firstHash);
    expect(negativeHash).not.toBe(firstHash);
    expect(dimensions).toEqual({ width: WIDTH, height: HEIGHT });
    expect(first.byteLength).toBeLessThanOrEqual(SIZE_LIMIT_BYTES);
  });
});
