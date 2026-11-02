import { ImageResponse } from 'next/og';
import type { ReactElement } from 'react';

import { loadFonts } from './fonts';

interface RenderSize {
  width: number;
  height: number;
}

export async function renderPng(
  element: ReactElement,
  { width, height }: RenderSize,
): Promise<Uint8Array> {
  const fonts = await loadFonts();
  const response = new ImageResponse(element, { width, height, fonts });

  return new Uint8Array(await response.arrayBuffer());
}
