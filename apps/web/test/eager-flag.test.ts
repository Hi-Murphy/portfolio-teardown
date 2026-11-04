import { readFileSync } from 'node:fs';
import { relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { collectSourceFiles } from './source-scan';

const APP_ROOT = fileURLToPath(new URL('../', import.meta.url));
const CONFIG_PATH = 'next.config.ts';
const HERO_PATH = 'components/hero/hero-live.tsx';
const WORKBENCH_PATH = 'components/workbench/workbench-loader.tsx';
const ENV_FLAG = 'NEXT_PUBLIC_EAGER_3D';
const DEFINE = '__XP_EAGER_3D__';

function source(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

function appPath(path: string): string {
  return relative(APP_ROOT, path).split(sep).join('/');
}

describe('eager 3D build flag', () => {
  test('the hero gates only its interaction wait behind the flag', () => {
    const text = source(HERO_PATH);
    const gatedInteraction = new RegExp(
      `if \\(!${DEFINE}\\) \\{\\s*` +
        'if \\(!\\(await waitForFirstInteraction\\(signal\\)\\)\\) return;\\s*\\}',
    ).exec(text);

    expect(gatedInteraction).not.toBeNull();
    expect(text).not.toContain(`process.env.${ENV_FLAG}`);
    expect(text.indexOf('const idle = await waitForIdle(signal);')).toBeGreaterThan(
      gatedInteraction?.index ?? -1,
    );
  });

  test('the workbench gates only its interaction wait behind the flag', () => {
    const text = source(WORKBENCH_PATH);
    const eagerMatch = new RegExp(`if \\(${DEFINE}\\) \\{([\\s\\S]*?)\\n      \\} else \\{`).exec(
      text,
    );
    const defaultBranch = /} else \{\s*const interacted = await waitForFirstInteraction\(/.exec(
      text,
    );

    expect(eagerMatch).not.toBeNull();
    expect(eagerMatch?.[1]).toContain("document.readyState === 'complete'");
    expect(eagerMatch?.[1]).not.toContain('waitForFirstInteraction');
    expect(defaultBranch).not.toBeNull();
    expect(text).not.toContain(`process.env.${ENV_FLAG}`);
    expect(text.indexOf('const idle = await waitForIdle(signal);')).toBeGreaterThan(
      eagerMatch?.index ?? -1,
    );
  });

  test('the eager workbench guards reduced motion and saveData before waiting for load', () => {
    const text = source(WORKBENCH_PATH);
    const eagerMatch = new RegExp(`if \\(${DEFINE}\\) \\{([\\s\\S]*?)\\n      \\} else \\{`).exec(
      text,
    );
    const eagerBranch = eagerMatch?.[1] ?? '';
    const guard = eagerBranch.indexOf('motion.reducedMotion.query');
    const loadWait = eagerBranch.indexOf("document.readyState === 'complete'");

    expect(eagerBranch).toContain('connection?.saveData === true');
    expect(guard).toBeGreaterThanOrEqual(0);
    expect(loadWait).toBeGreaterThan(guard);
  });

  test('only the Next config reads the eager environment flag', () => {
    const readers = collectSourceFiles(APP_ROOT)
      .filter((file) => readFileSync(file, 'utf8').includes(ENV_FLAG))
      .map(appPath)
      .sort();

    expect(readers).toEqual([CONFIG_PATH]);
  });

  test('both call sites use the bare build-time define', () => {
    for (const path of [HERO_PATH, WORKBENCH_PATH]) {
      expect(source(path)).toContain(DEFINE);
    }
  });
});
