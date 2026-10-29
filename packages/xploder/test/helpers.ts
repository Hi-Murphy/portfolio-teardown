import { readFileSync } from 'node:fs';

export function loadJson(relPath: string): unknown {
  return JSON.parse(readFileSync(new URL(relPath, import.meta.url), 'utf8'));
}
