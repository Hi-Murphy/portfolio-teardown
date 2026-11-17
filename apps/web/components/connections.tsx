import Link from 'next/link';

import type { Connection } from '../content/projects/relationships';

export interface ConnectionsProps {
  readonly connections: readonly Connection[];
}

export function Connections({ connections }: ConnectionsProps) {
  if (connections.length === 0) return null;

  return (
    <section
      aria-labelledby="site-connections-title"
      data-site-connections=""
      className="mt-10 border-t border-line/30 pt-5"
    >
      <h2
        id="site-connections-title"
        className="font-mono text-xs uppercase tracking-[0.16em] text-muted"
      >
        Connections
      </h2>
      <ul aria-labelledby="site-connections-title" className="mt-3 flex flex-col gap-3">
        {connections.map((connection) => (
          <li
            key={connection.slug}
            data-relationship-kind={connection.kind}
            className="flex flex-col gap-1"
          >
            <Link
              href={`/projects/${connection.slug}`}
              className="inline-flex min-h-11 min-w-11 w-fit items-center text-base font-semibold text-fg underline decoration-line underline-offset-4 hover:decoration-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {connection.name}
            </Link>
            <p className="max-w-[62ch] text-sm leading-relaxed text-muted">{connection.note}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
