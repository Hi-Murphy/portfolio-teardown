import type { JsonLdObject } from 'schema-dts';

interface JsonLdProps {
  readonly data: JsonLdObject & { readonly '@context': 'https://schema.org' };
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}
