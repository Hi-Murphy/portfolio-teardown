import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const runDirs = process.argv.slice(2);
if (runDirs.length === 0) {
  console.error('usage: node summarise-runs.mjs <runDir...>');
  process.exit(2);
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

const runs = await Promise.all(
  runDirs.map(async (dir) => {
    const absolute = resolve(dir);
    const [cls, probe] = await Promise.all([
      readJson(resolve(absolute, 'cls.json')),
      readJson(resolve(absolute, 'site-probe.json')),
    ]);
    const clsGroup = probe.groups.find((group) => group.group === 'cls');
    const drillGroup = probe.groups.find((group) => group.group === 'drill');
    if (clsGroup === undefined || drillGroup === undefined) {
      throw new Error(`${dir}: cls.json/site-probe.json is missing a required group`);
    }
    return { dir, cls, clsGroup, drillGroup };
  }),
);

const cellKey = (cell) => `${cell.route}\u0000${cell.viewport}\u0000${cell.palette}`;
const firstCells = runs[0].cls.cells;
const markNames = runs[0].clsGroup.checks
  .filter((check) => check.name.startsWith('hero-marks-stable-'))
  .map((check) => check.name);
const drillNames = runs[0].drillGroup.checks.map((check) => check.name);

function valuesFor(getValues, names) {
  return names.map((name) =>
    runs.map((run) => getValues(run).get(name) ?? 'MISSING'),
  );
}

const cellRows = valuesFor(
  (run) => new Map(run.cls.cells.map((cell) => [cellKey(cell), cell])),
  firstCells.map(cellKey),
);
const markRows = valuesFor(
  (run) => new Map(run.clsGroup.checks.map((check) => [check.name, check])),
  markNames,
);
const drillRows = valuesFor(
  (run) => new Map(run.drillGroup.checks.map((check) => [check.name, check])),
  drillNames,
);

console.log(`# T005 CLS + drill — ${runs.length} runs`);
console.log(`# runs: ${runs.map((run) => run.dir).join(', ')}`);
console.log('');
console.log('| check | route | viewport | palette | run 1 | run 2 | run 3 | run 4 | run 5 |');
console.log('|---|---|---|---|---:|---:|---:|---:|---:|');

firstCells.forEach((cell, index) => {
  const columns = cellRows[index].map((value) =>
    value === 'MISSING' ? value : value.total.toFixed(6),
  );
  console.log(
    `| cls | ${cell.route} | ${cell.viewport} | ${cell.palette} | ${columns.join(' | ')} |`,
  );
});

markNames.forEach((name, index) => {
  const columns = markRows[index].map((value) =>
    value === 'MISSING' ? value : value.pass ? 'PASS' : 'FAIL',
  );
  const viewport = name.replace('hero-marks-stable-', '');
  console.log(`| hero marks | - | ${viewport} | dark | ${columns.join(' | ')} |`);
});

console.log('');
console.log('| drill check | run 1 | run 2 | run 3 | run 4 | run 5 |');
console.log('|---|---|---|---|---|---|');

drillNames.forEach((name, index) => {
  const columns = drillRows[index].map((value) =>
    value === 'MISSING' ? value : value.pass ? 'PASS' : 'FAIL',
  );
  console.log(`| ${name} | ${columns.join(' | ')} |`);
});

const clsPass = runs.every(
  (run) => run.cls.pass && run.cls.cells.every((cell) => cell.pass && cell.total === 0),
);
const marksPass = runs.every(
  (run) => run.clsGroup.checks.every((check) => check.pass || !check.name.startsWith('hero-marks-')),
);
const drillPass = runs.every((run) => run.drillGroup.pass);
const allValuesPresent = [...cellRows, ...markRows, ...drillRows].every((row) =>
  row.every((column) => column !== 'MISSING'),
);
const verdict = allValuesPresent && clsPass && marksPass && drillPass ? 'PASS' : 'FAIL';

console.log('');
console.log(
  `OVERALL ${verdict} — 0 CLS in every cell: ${clsPass ? 'yes' : 'no'}; hero marks PASS in every run: ${marksPass ? 'yes' : 'no'}; drill all PASS in every run: ${drillPass ? 'yes' : 'no'}.`,
);

if (verdict !== 'PASS') process.exitCode = 1;
