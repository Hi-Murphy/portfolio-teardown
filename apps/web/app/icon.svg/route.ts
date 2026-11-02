import { iconSvg } from '../../seo/icon';

export const dynamic = 'force-static';

export function GET(): Response {
  return new Response(iconSvg(), {
    headers: { 'content-type': 'image/svg+xml; charset=utf-8' },
  });
}
