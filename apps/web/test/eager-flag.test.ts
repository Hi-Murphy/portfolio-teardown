import { readFileSync } from 'node:fs';
import { relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { collectSourceFiles } from './source-scan';

const APP_ROOT = fileURLToPath(new URL('../', import.meta.url));
const CONFIG_PATH = 'next.config.ts';
const DECLARATIONS_PATH = 'eager-3d.d.ts';
const HERO_PATH = 'components/hero/hero-live.tsx';
const WORKBENCH_PATH = 'components/workbench/workbench-loader.tsx';
const ENV_FLAG = 'NEXT_PUBLIC_EAGER_3D';
const RETIRED_HERO_ENV_FLAG = 'NEXT_PUBLIC_EAGER_HERO';
const GATED_HERO_ENV_FLAG = 'NEXT_PUBLIC_GATED_HERO';
const DEFINE = '__XP_EAGER_3D__';
const HERO_DEFINE = '__XP_EAGER_HERO__';

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
      `if \\(!\\(${DEFINE} \\|\\| ${HERO_DEFINE}\\)\\) \\{\\s*` +
        'if \\(!\\(await waitForFirstInteraction\\(signal\\)\\)\\) return;\\s*\\}',
    ).exec(text);

    expect(gatedInteraction).not.toBeNull();
    for (const flag of [ENV_FLAG, RETIRED_HERO_ENV_FLAG, GATED_HERO_ENV_FLAG]) {
      expect(text).not.toContain(`process.env.${flag}`);
    }
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

  test('only the Next config reads the eager environment flags', () => {
    const readers = collectSourceFiles(APP_ROOT)
      .filter((file) => {
        const text = readFileSync(file, 'utf8');
        return (
          text.includes(ENV_FLAG) ||
          text.includes(RETIRED_HERO_ENV_FLAG) ||
          text.includes(GATED_HERO_ENV_FLAG)
        );
      })
      .map(appPath)
      .sort();

    expect(readers).toEqual([CONFIG_PATH]);
  });

  test('the hero-only define is consumed only by the hero', () => {
    const consumers = collectSourceFiles(APP_ROOT)
      .filter((file) => {
        const path = appPath(file);
        return path !== CONFIG_PATH && !path.endsWith('.d.ts');
      })
      .filter((file) => readFileSync(file, 'utf8').includes(HERO_DEFINE))
      .map(appPath)
      .sort();

    expect(consumers).toEqual([HERO_PATH]);
  });

  test('the Next config exposes both eager defines', () => {
    const text = source(CONFIG_PATH);

    expect(text).toContain(`process.env.${ENV_FLAG} === '1'`);
    expect(text).toContain(`process.env.${GATED_HERO_ENV_FLAG} !== '1'`);
    expect(text).not.toContain(`process.env.${RETIRED_HERO_ENV_FLAG}`);
    expect(text).toContain(`${DEFINE}: eager3d`);
    expect(text).toContain(`${HERO_DEFINE}: eagerHero`);
  });

  test('the hero exposes its compile-time live mode', () => {
    expect(source(HERO_PATH)).toContain(
      "data-site-live-mode={__XP_EAGER_3D__ || __XP_EAGER_HERO__ ? 'eager' : 'gated'}",
    );
  });

  test('both defines are declared and used at their call sites', () => {
    const declarations = source(DECLARATIONS_PATH);

    expect(declarations).toContain(`declare const ${DEFINE}: boolean;`);
    expect(declarations).toContain(`declare const ${HERO_DEFINE}: boolean;`);
    expect(source(HERO_PATH)).toContain(DEFINE);
    expect(source(HERO_PATH)).toContain(HERO_DEFINE);
    expect(source(WORKBENCH_PATH)).toContain(DEFINE);
    expect(source(WORKBENCH_PATH)).not.toContain(HERO_DEFINE);
  });
});
