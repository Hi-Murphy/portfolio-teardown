import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';

import { exemptionFor, scanText } from '../../../apps/web/scripts/redaction-scan.ts';

const BUILD_EXTENSIONS = new Set(['.html', '.txt', '.js', '.css', '.xml', '.json']);

function buildFiles(directory) {
  const files = [];

  function walk(current) {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) {
        walk(path);
      } else if (entry.isFile() && BUILD_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
        files.push(path);
      }
    }
  }

  walk(directory);
  return files.sort();
}

function collect(directory) {
  const triples = new Map();

  for (const path of buildFiles(directory)) {
    const text = readFileSync(path, 'utf8');
    const file = relative(directory, path).split(sep).join('/');
    for (const hit of scanText(text, file, 'build')) {
      const key = JSON.stringify([hit.cls, hit.patternId, hit.match]);
      if (!triples.has(key)) triples.set(key, { hit, text });
    }
  }

  return triples;
}

const [baseOut, headOut, ...rest] = process.argv.slice(2);
if (baseOut === undefined || headOut === undefined || rest.length > 0) {
  console.error('usage: g2-diff.mjs <baseOut> <headOut>');
  process.exitCode = 2;
} else if (!existsSync(baseOut) || !existsSync(headOut)) {
  console.error('baseOut and headOut must both exist');
  process.exitCode = 2;
} else {
  const base = collect(baseOut);
  const head = collect(headOut);
  const added = [...head.entries()].filter(([key]) => !base.has(key));
  let unexempted = 0;

  console.log(`base distinct: ${base.size}`);
  console.log(`head distinct: ${head.size}`);

  for (const [, { hit, text }] of added) {
    const ruleId = exemptionFor(hit, text);
    if (ruleId === undefined) unexempted += 1;
    console.log(
      `NEW ${hit.cls} ${hit.patternId} ${hit.match.slice(0, 4)}… rule=${ruleId ?? 'UNEXEMPTED'}`,
    );
  }

  console.log(`new distinct: ${added.length}, of which unexempted: ${unexempted}`);
  process.exitCode = unexempted === 0 ? 0 : 6;
}
