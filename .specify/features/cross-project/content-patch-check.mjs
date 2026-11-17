#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const BASE = 'f0c2d37';
const RELATIONSHIP_SLUGS = ['jev-toolkit', 'websocket-inspector'];
const RELATIONSHIPS_SOURCE_DIR = '.specify/content/relationships';
const BRIEF_PATH = '.specify/slices/slice-17-cross-project.md';

function readRepoFile(path) {
  return readFileSync(resolve(REPO_ROOT, path));
}

function readBaseFile(path) {
  return execFileSync('git', ['show', `${BASE}:${path}`], { cwd: REPO_ROOT });
}

function readBriefRelationships() {
  const brief = readRepoFile(BRIEF_PATH).toString('utf8');
  const pattern = /^\s*-\s+`(jev-toolkit|websocket-inspector)`\s+→\s+`(websocket-inspector|jev-toolkit)`:\s+kind\s+`(measured-on|shares-stack|same-engine)`,\s+note\s+\*"([^"\n]+)"\*\s*$/gm;
  const entries = new Map();

  for (const match of brief.matchAll(pattern)) {
    entries.set(match[1], { to: match[2], kind: match[3], note: match[4] });
  }

  assert.equal(entries.size, 2, 'brief must contain exactly two relationship Content bullets');

  return entries;
}

const sealedFiles = [
  '.specify/content/jev-toolkit.json',
  '.specify/content/websocket-inspector.json',
  '.specify/content/site.json',
];

for (const path of sealedFiles) {
  assert.deepEqual(readRepoFile(path), readBaseFile(path), `${path} differs from ${BASE}`);
  console.log(`CONTENT-PATCH PASS ${path}`);
}

const expectedNames = RELATIONSHIP_SLUGS.map((slug) => `${slug}.json`).sort();
const actualNames = readdirSync(resolve(REPO_ROOT, RELATIONSHIPS_SOURCE_DIR)).sort();
assert.deepEqual(actualNames, expectedNames, 'relationship content directory has unexpected files');

const expectedRelationships = readBriefRelationships();

for (const slug of RELATIONSHIP_SLUGS) {
  const path = `${RELATIONSHIPS_SOURCE_DIR}/${slug}.json`;
  const bytes = readRepoFile(path);
  const parsed = JSON.parse(bytes.toString('utf8'));
  const expected = expectedRelationships.get(slug);

  assert.ok(expected, `brief has no relationship entry for ${slug}`);
  assert.deepEqual(Object.keys(parsed), ['relationships'], `${path} must have only relationships`);
  assert.deepEqual(parsed.relationships, [expected], `${path} does not match the brief`);
  assert.deepEqual(
    bytes,
    Buffer.from(`${JSON.stringify(parsed, null, 2)}\n`),
    `${path} is not canonical JSON`,
  );
  console.log(`CONTENT-PATCH PASS ${path}`);
}
