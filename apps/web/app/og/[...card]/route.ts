import { renderPng } from '../../../seo/og/render';
import { cardElement } from '../../../seo/og/card';
import { cardModel } from '../../../seo/og/card-model';
import { INDEXABLE_ROUTES, type SeoRoute } from '../../../seo/routes';

export const dynamic = 'force-static';
export const dynamicParams = false;

const CARD_PREFIX = '/og/';
const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;

interface CardRouteContext {
  readonly params: Promise<{ readonly card: readonly string[] }>;
}

export function generateStaticParams(): { card: string[] }[] {
  return INDEXABLE_ROUTES.map((route) => ({
    card: route.ogImagePath.slice(CARD_PREFIX.length).split('/'),
  }));
}

function routeForCard(card: readonly string[]): SeoRoute | undefined {
  const imagePath = `${CARD_PREFIX}${card.join('/')}`;

  return INDEXABLE_ROUTES.find((route) => route.ogImagePath === imagePath);
}

export async function GET(_request: Request, { params }: CardRouteContext): Promise<Response> {
  const { card } = await params;
  const route = routeForCard(card);

  if (route === undefined) return new Response(null, { status: 404 });

  const bytes = await renderPng(cardElement(cardModel(route)), {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  });
  const body = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;

  return new Response(body, { headers: { 'content-type': 'image/png' } });
}
