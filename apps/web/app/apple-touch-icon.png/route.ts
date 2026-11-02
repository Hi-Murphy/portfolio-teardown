import { appleIconElement } from '../../seo/icon';
import { renderPng } from '../../seo/og/render';

export const dynamic = 'force-static';

const SIZE = 180;

export async function GET(): Promise<Response> {
  const png = await renderPng(appleIconElement(), { width: SIZE, height: SIZE });
  const body = new Uint8Array(png).buffer;

  return new Response(body, { headers: { 'content-type': 'image/png' } });
}
