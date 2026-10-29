import { readFile, stat } from 'node:fs/promises';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { gzipSync } from 'node:zlib';

export interface ServeOptions {
  port?: number;
  host?: '127.0.0.1';
}

export interface ServedDir {
  url: URL;
  close(): Promise<void>;
}

interface FileLookup {
  kind: 'file';
  path: string;
}

interface ForbiddenLookup {
  kind: 'forbidden';
}

interface MissingLookup {
  kind: 'missing';
}

type Lookup = FileLookup | ForbiddenLookup | MissingLookup;

const IMMUTABLE_CACHE = 'public, max-age=31536000, immutable';
const REVALIDATE_CACHE = 'public, max-age=0, must-revalidate';

const MIME_TYPES: Record<string, string> = {
  '.avif': 'image/avif',
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.otf': 'font/otf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
};

function contentType(filePath: string): string {
  return MIME_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}

function isCompressible(type: string): boolean {
  const mime = type.split(';', 1)[0]?.trim().toLowerCase() ?? '';
  return (
    mime.startsWith('text/') ||
    mime === 'application/javascript' ||
    mime === 'application/json' ||
    mime === 'application/manifest+json' ||
    mime === 'application/xml' ||
    mime === 'image/svg+xml'
  );
}

function acceptsGzip(header: string | string[] | undefined): boolean {
  const raw = Array.isArray(header) ? header.join(',') : header;
  if (!raw) return false;

  return raw.split(',').some((entry) => {
    const [coding, ...params] = entry.trim().toLowerCase().split(';');
    if (coding !== 'gzip' && coding !== '*') return false;

    const quality = params.map((param) => param.trim()).find((param) => param.startsWith('q='));
    if (!quality) return true;

    const value = Number(quality.slice(2));
    return Number.isFinite(value) && value > 0;
  });
}

function cacheControl(pathname: string): string {
  return pathname.startsWith('/_next/static/') ? IMMUTABLE_CACHE : REVALIDATE_CACHE;
}

function isInside(root: string, candidate: string): boolean {
  const pathFromRoot = relative(root, candidate);
  return (
    pathFromRoot === '' ||
    (pathFromRoot !== '..' && !pathFromRoot.startsWith(`..${sep}`) && !isAbsolute(pathFromRoot))
  );
}

function isMissing(error: unknown): boolean {
  if (!(error instanceof Error) || !('code' in error)) return false;
  return error.code === 'ENOENT' || error.code === 'ENOTDIR';
}

function hasParentSegment(pathname: string): boolean {
  return pathname.split(/[\\/]+/).includes('..');
}

async function findFile(root: string, pathname: string): Promise<Lookup> {
  if (hasParentSegment(pathname)) {
    return { kind: 'forbidden' };
  }

  const pathWithoutLeadingSlash = pathname.replace(/^\/+/, '');
  const candidates =
    pathname.endsWith('/') || pathWithoutLeadingSlash === ''
      ? [join(pathWithoutLeadingSlash, 'index.html')]
      : [
          `${pathWithoutLeadingSlash}.html`,
          join(pathWithoutLeadingSlash, 'index.html'),
          pathWithoutLeadingSlash,
        ];

  for (const candidate of candidates) {
    const filePath = resolve(root, candidate);
    if (!isInside(root, filePath)) {
      return { kind: 'forbidden' };
    }

    try {
      const info = await stat(filePath);
      if (info.isFile()) return { kind: 'file', path: filePath };
    } catch (error) {
      if (!isMissing(error)) throw error;
    }
  }

  return { kind: 'missing' };
}

function responseHeaders(
  pathname: string,
  type: string,
  length: number,
  gzip: boolean,
): Record<string, string> {
  const headers: Record<string, string> = {
    'Cache-Control': cacheControl(pathname),
    'Content-Length': String(length),
    'Content-Type': type,
    'X-Content-Type-Options': 'nosniff',
  };

  if (gzip) {
    headers['Content-Encoding'] = 'gzip';
    headers.Vary = 'Accept-Encoding';
  }

  return headers;
}

async function send(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  status: number,
  body: Buffer,
  type: string,
): Promise<void> {
  const useGzip = acceptsGzip(req.headers['accept-encoding']) && isCompressible(type);
  const payload = useGzip ? gzipSync(body) : body;
  const headers = responseHeaders(pathname, type, payload.byteLength, useGzip);

  res.writeHead(status, headers);
  res.end(req.method === 'HEAD' ? undefined : payload);
}

async function notFound(root: string, req: IncomingMessage, res: ServerResponse): Promise<void> {
  const fallback = resolve(root, '404.html');
  if (isInside(root, fallback)) {
    try {
      const body = await readFile(fallback);
      await send(req, res, '/404.html', 404, body, 'text/html; charset=utf-8');
      return;
    } catch (error) {
      if (!isMissing(error)) throw error;
    }
  }

  await send(req, res, '/404.html', 404, Buffer.from('Not Found\n'), 'text/plain; charset=utf-8');
}

async function handleRequest(
  root: string,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const body = Buffer.from('Method Not Allowed\n');
    res.writeHead(405, {
      Allow: 'GET, HEAD',
      'Content-Length': String(body.byteLength),
      'Content-Type': 'text/plain; charset=utf-8',
    });
    res.end(body);
    return;
  }

  const rawPath = (req.url ?? '/').split('?', 1)[0] ?? '/';
  let pathname: string;
  try {
    pathname = decodeURIComponent(rawPath);
  } catch {
    const body = Buffer.from('Bad Request\n');
    res.writeHead(400, {
      'Content-Length': String(body.byteLength),
      'Content-Type': 'text/plain; charset=utf-8',
    });
    res.end(body);
    return;
  }

  if (!pathname.startsWith('/') || pathname.includes('\0')) {
    const body = Buffer.from('Bad Request\n');
    res.writeHead(400, {
      'Content-Length': String(body.byteLength),
      'Content-Type': 'text/plain; charset=utf-8',
    });
    res.end(body);
    return;
  }

  const lookup = await findFile(root, pathname);
  if (lookup.kind === 'forbidden') {
    const body = Buffer.from('Forbidden\n');
    res.writeHead(403, {
      'Content-Length': String(body.byteLength),
      'Content-Type': 'text/plain; charset=utf-8',
    });
    res.end(body);
    return;
  }

  if (lookup.kind === 'missing') {
    await notFound(root, req, res);
    return;
  }

  const body = await readFile(lookup.path);
  await send(req, res, pathname, 200, body, contentType(lookup.path));
}

export async function serveDir(dir: string, opts: ServeOptions = {}): Promise<ServedDir> {
  const root = resolve(dir);
  const host = opts.host ?? '127.0.0.1';

  const server = createServer((req, res) => {
    void handleRequest(root, req, res).catch(() => {
      if (!res.headersSent) {
        const body = Buffer.from('Internal Server Error\n');
        res.writeHead(500, {
          'Content-Length': String(body.byteLength),
          'Content-Type': 'text/plain; charset=utf-8',
        });
        res.end(body);
      } else {
        res.destroy();
      }
    });
  });

  server.on('clientError', (_error, socket) => {
    if (socket.writable) {
      socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
    }
  });

  await new Promise<void>((resolveListen, rejectListen) => {
    const onError = (error: Error): void => rejectListen(error);
    server.once('error', onError);
    server.listen(opts.port ?? 0, host, () => {
      server.off('error', onError);
      resolveListen();
    });
  });

  const address = server.address() as AddressInfo;
  let closing: Promise<void> | undefined;

  return {
    url: new URL(`http://${host}:${address.port}/`),
    close: (): Promise<void> => {
      closing ??= new Promise<void>((resolveClose, rejectClose) => {
        server.closeAllConnections();
        server.close((error) => {
          if (error) {
            rejectClose(error);
          } else {
            resolveClose();
          }
        });
      });
      return closing;
    },
  };
}
