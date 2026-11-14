#!/usr/bin/env node
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const SLOW_CLASS_MIN = 1900;
const SLOW_CLASS_MAX = 2600;
const EXPECTED_PROBE_RUNS = 2;
const LIGHTHOUSE_DIRS = ['lighthouse-r1', 'lighthouse-r2'];
const PROBE_CONDITIONS = [
  { label: 'live', dir: 'probe-live' },
  { label: 'reduced-motion', dir: 'probe-reduced-motion' },
  { label: 'save-data', dir: 'probe-save-data' },
];

function parseArgs(argv) {
  let dir;
  let shard = process.env.SHARD ?? 'local';

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--dir') {
      dir = argv[index + 1];
      index += 1;
    } else if (argument.startsWith('--dir=')) {
      dir = argument.slice('--dir='.length);
    } else if (argument === '--shard') {
      shard = argv[index + 1];
      index += 1;
    } else if (argument.startsWith('--shard=')) {
      shard = argument.slice('--shard='.length);
    } else {
      throw new Error(`unknown argument: ${argument}`);
    }
  }

  if (!dir) throw new Error('usage: ci-summary.mjs --dir <evidence-dir> [--shard <number>]');
  return { dir, shard };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function lighthouseValues(directory) {
  try {
    const summary = await readJson(join(directory, 'lighthouse-summary.json'));
    const values = (summary.runs ?? [])
      .map((run) => run.benchmarkIndex)
      .filter((value) => Number.isFinite(value));
    if (values.length > 0) return values;
  } catch {
    // Fall back to the raw reports when a summary was not written.
  }

  let names;
  try {
    names = await readdir(directory);
  } catch {
    return [];
  }

  const values = [];
  for (const name of names.filter((entry) => /^lighthouse-run-\d+\.json$/.test(entry)).sort()) {
    try {
      const report = await readJson(join(directory, name));
      const value = report.environment?.benchmarkIndex;
      if (Number.isFinite(value)) values.push(value);
    } catch {
      // A failed invocation is reported by its missing values.
    }
  }
  return values;
}

async function probeResult(directory) {
  let names;
  try {
    names = await readdir(directory);
  } catch {
    return { passed: 0, total: 0, pass: false };
  }

  const results = [];
  for (const name of names.filter((entry) => entry.endsWith('.json')).sort()) {
    try {
      results.push(await readJson(join(directory, name)));
    } catch {
      // A malformed artifact cannot prove the condition.
    }
  }

  const passed = results.filter((result) => result.pass === true).length;
  return {
    passed,
    total: results.length,
    pass: results.length === EXPECTED_PROBE_RUNS && passed === EXPECTED_PROBE_RUNS,
  };
}

function formatValue(value) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(1)));
}

async function main() {
  const { dir, shard } = parseArgs(process.argv.slice(2));
  const lighthouse = [];

  for (const name of LIGHTHOUSE_DIRS) {
    lighthouse.push({ name, values: await lighthouseValues(join(dir, name)) });
  }

  const benchmarkIndices = lighthouse.flatMap((entry) => entry.values);
  const min = benchmarkIndices.length === 0 ? null : Math.min(...benchmarkIndices);
  const max = benchmarkIndices.length === 0 ? null : Math.max(...benchmarkIndices);
  const invocationsPresent = lighthouse.filter((entry) => entry.values.length > 0).length;
  const slowClass =
    invocationsPresent === LIGHTHOUSE_DIRS.length &&
    benchmarkIndices.every((value) => value >= SLOW_CLASS_MIN && value <= SLOW_CLASS_MAX);

  const probes = [];
  for (const condition of PROBE_CONDITIONS) {
    probes.push({
      ...condition,
      ...(await probeResult(join(dir, condition.dir))),
    });
  }

  const lines = [
    `## m1-validation - shard ${shard}`,
    '',
    '### Lighthouse',
    '',
    `- Invocations: ${invocationsPresent}/${LIGHTHOUSE_DIRS.length}`,
    ...lighthouse.map(
      (entry) =>
        `- ${entry.name}${entry.values.length === 0 ? ': missing' : `: ${entry.values.map(formatValue).join(', ')}`}`,
    ),
    `- benchmarkIndex min-max: ${min === null ? 'n/a' : `${formatValue(min)}-${formatValue(max)}`}`,
    `- slow-class [${SLOW_CLASS_MIN}, ${SLOW_CLASS_MAX}]: ${slowClass ? 'PASS' : 'FAIL'}`,
    '',
    '### Eager probes',
    '',
    '| Condition | Runs | Result |',
    '|---|---:|---|',
    ...probes.map(
      (probe) =>
        `| ${probe.label} | ${probe.passed}/${EXPECTED_PROBE_RUNS} | ${probe.pass ? 'PASS' : 'FAIL'} |`,
    ),
    '',
  ];

  process.stdout.write(`${lines.join('\n')}\n`);
}

try {
  await main();
} catch (error) {
  console.error(`ci-summary: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 2;
}
