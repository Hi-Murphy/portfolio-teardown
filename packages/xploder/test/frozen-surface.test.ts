import { describe, expect, test } from 'vitest';

import manifestJson from './frozen-surface.manifest.json';
import manifestS5Json from './frozen-surface.s5.manifest.json';
import manifestS6Json from './frozen-surface.s6.manifest.json';
import manifestS7Json from './frozen-surface.s7.manifest.json';
import manifestS8Json from './frozen-surface.s8.manifest.json';

interface FrozenSurfaceManifest {
  readonly base: string;
  readonly note: string;
  readonly files: Readonly<Record<string, string>>;
}

const REQUIRED_FILES = [
  'src/schema/project.ts',
  'src/motion/index.ts',
  'src/engine/camera.ts',
  'src/react/scene/CameraRig.tsx',
  'test/scene.test.tsx',
] as const;
const REQUIRED_S5_FILES = [
  'src/interaction/tour.ts',
  'src/react/scene/Emphasis.tsx',
  'src/react/scene/ViewScroll.tsx',
  'test/tour.test.ts',
] as const;
const REQUIRED_S6_FILES = [
  'src/overlay/model.ts',
  'src/look/tokens.ts',
  'src/react/scene/OverlayProjector.tsx',
  'test/overlay-place.test.ts',
] as const;
const REQUIRED_S7_FILES = [
  'src/panel/state.ts',
  'src/panel/place.ts',
  'src/lettering/model.ts',
  'src/react/panel/useSlabClick.ts',
  'test/panel-place.test.ts',
] as const;
const TIER_B_S7_FILES = [
  'src/react/panel/PanelLayer.tsx',
  'src/react/panel/DetailPanel.tsx',
  'src/react/panel/TechChips.tsx',
  'src/react/panel/useViewerPanels.ts',
  'src/react/lettering/PartLettering.tsx',
] as const;
const REQUIRED_S8_FILES = [
  'src/a11y/navigator.ts',
  'src/react/a11y/LiveRegion.tsx',
  'src/react/TeardownViewer.tsx',
  'src/react/panel/PanelLayer.tsx',
  'test/a11y-navigator.test.ts',
] as const;

type RawImportMeta = ImportMeta & {
  glob(
    pattern: string,
    options: { query: '?raw'; import: 'default'; eager: true },
  ): Record<string, string>;
};

function normalizePath(path: string): string {
  const segments: string[] = [];

  for (const segment of path.split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') segments.pop();
    else segments.push(segment);
  }

  return segments.join('/');
}

function under(directory: string, path: string): string {
  const normalized = normalizePath(path);

  return normalized.startsWith(`${directory}/`) ? normalized : `${directory}/${normalized}`;
}

const packageFiles = Object.entries(
  (import.meta as RawImportMeta).glob('../package.json', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
).map(([path, contents]) => [normalizePath(path), contents] as const);
const sourceFiles = Object.entries(
  (import.meta as RawImportMeta).glob('../src/**/*', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
).map(([path, contents]) => [under('src', path), contents] as const);
const testFiles = Object.entries(
  (import.meta as RawImportMeta).glob('../test/**/*', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
).map(([path, contents]) => [under('test', path), contents] as const);
const snapshotFiles = Object.entries(
  (import.meta as RawImportMeta).glob('../test/__snapshots__/*.snap', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
).map(([path, contents]) => [under('test', path), contents] as const);
const rawFiles = Object.fromEntries([
  ...packageFiles,
  ...sourceFiles,
  ...testFiles,
  ...snapshotFiles,
]);
async function sha256(contents: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(contents));

  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

describe('frozen S2/S4 surface', () => {
  test('matches every hash recorded from the base commit', async () => {
    const manifest = manifestJson as FrozenSurfaceManifest;
    const entries = Object.entries(manifest.files);

    expect(manifest.base).toBe('3aee8fc');
    expect(manifest.note).toBe(
      'S05 freeze (RFC D1/R5). A later slice that changes a listed file regenerates this manifest in the same diff and states why. Re-sealed in S11.9 at 3aee8fc: src/engine/camera.ts — opt-in camera zoom tween (R10); see .specify/features/home-composition/evidence/T011l-log-zoom.md. Re-sealed in S11.9 at 3aee8fc: src/react/scene/CameraRig.tsx — opt-in camera zoom tween (R10); see .specify/features/home-composition/evidence/T011l-log-zoom.md.',
    );
    expect(entries.length).toBeGreaterThanOrEqual(40);

    for (const path of REQUIRED_FILES) {
      expect(manifest.files).toHaveProperty(path);
    }

    for (const [path, expected] of entries) {
      const workingCopy = rawFiles[path];

      if (workingCopy === undefined) throw new Error(`Missing working copy for ${path}`);

      expect(await sha256(workingCopy), path).toBe(expected);
    }
  });

  test('the hash helper detects a one-byte change', async () => {
    const before = new TextEncoder().encode('frozen-surface');
    const after = before.slice();

    after[0] = (after[0] ?? 0) ^ 1;

    expect(await sha256(new TextDecoder().decode(before))).not.toBe(
      await sha256(new TextDecoder().decode(after)),
    );
    expect(await sha256('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});

describe('frozen S5 surface', () => {
  test('matches every hash recorded from the base commit', async () => {
    const manifest = manifestS5Json as FrozenSurfaceManifest;
    const entries = Object.entries(manifest.files);

    expect(manifest.base).toBe('5d3abdb');
    expect(manifest.note).toBe(
      'S05 seal (S06 RFC D1). A later slice that changes a listed file regenerates this manifest in the same diff and states why. Re-sealed in S11.9 at 3aee8fc: src/react/useTeardownViewer.ts — opt-in camera zoom tween (R10); see .specify/features/home-composition/evidence/T011l-log-zoom.md. Re-sealed in S13 (revision 1 of 2) at 51d3fa7: src/react/useTourClock.ts — dispatch the final tick when the last boundary has already passed (tour could stay playing on its last step) + test/tour-clock-boundary.test.tsx; see .specify/features/jev-content/evidence/R1-revision-note.md. Re-sealed in S14 at edde9d0: src/interaction/emphasis.ts + src/react/scene/Emphasis.tsx — optional selected emphasis input lit alongside highlight (I-09) + test/emphasis-selected.test.ts; see .specify/features/engine-polish/evidence/T003-log-reseal.txt. Re-sealed in S15 at 12cc065: src/time/clock.ts + src/time/fake.ts — one injectable, pausable engine clock, the only host-time reader (E1) + test/clock.test.ts; see .specify/features/engine-timing/evidence/T002-log-green.txt. Re-sealed in S15 at 1ff1d01: src/react/useTeardownViewer.ts + src/react/useTourClock.ts — the viewer owns the engine clock (viewer.clock); tour boundaries on clock.schedule (E1) + test/tour-clock-engine.test.tsx; see .specify/features/engine-timing/evidence/T004-log-s13-reproof.txt. Re-sealed in S15 at 74394e9: test/no-time-reads.test.ts + test/no-real-timers.test.ts — the AC1 scanners (E1); see .specify/features/engine-timing/evidence/T006-log-green.txt. Re-sealed in S15 at 5d3abdb: src/react/useTeardownViewer.ts — actions.pause()/resume() freeze and continue the scene on the engine clock (a playing tour is paused and resumed with it); tour-only pause is actions.pauseTour(); viewer.paused (E2, R12) + test/viewer-pause.test.tsx; see .specify/features/engine-timing/evidence/T007-log-green.txt.',
    );
    expect(entries.length).toBeGreaterThanOrEqual(25);

    for (const path of REQUIRED_S5_FILES) {
      expect(manifest.files).toHaveProperty(path);
    }

    for (const [path, expected] of entries) {
      const workingCopy = rawFiles[path];

      if (workingCopy === undefined) throw new Error(`Missing working copy for ${path}`);

      expect(await sha256(workingCopy), path).toBe(expected);
    }
  });
});

describe('frozen S6 surface', () => {
  test('matches every hash recorded from the base commit', async () => {
    const manifest = manifestS6Json as FrozenSurfaceManifest;
    const entries = Object.entries(manifest.files);

    expect(manifest.base).toBe('ea61882');
    expect(manifest.note).toBe(
      'S06 seal (S07 RFC D1). Re-sealed in S10 at f65b13c: src/overlay/model.ts gained the tour-trail overlay (S10 Q16, Murphy-authorised revision; see .specify/features/site-shell/evidence/Q16-revision-note.md). A later slice that changes a listed file regenerates this manifest in the same diff and states why. Re-sealed in S11.8 at 057d89a: src/overlay/place.ts — output-identical lazy first-fit placement search with prepared obstacle bounds (E1a); see .specify/features/hero-eager/evidence/T006-log-e1a-ab.md. Re-sealed in S14 at b5a4713: src/overlay/model.ts — dimension notes avoid the plate layer-name quads; every other placement output-identical (I-05) + test/overlay-note-clear.test.ts; see .specify/features/engine-polish/evidence/T008-log-rects.md. Re-sealed in S15 at d4efeaf: src/react/scene/Scene.tsx — every tween samples the injected engine clock (E1: explode, camera, emphasis) + test/scene-clock.test.tsx; see .specify/features/engine-timing/evidence/T003-log-green.txt. Re-sealed in S15 at 2c9187d: src/react/scene/OverlayProjector.tsx + src/react/scene/Scene.tsx — overlay events stamped in engine time; none while the clock is paused (E1) + test/overlay-clock.test.tsx; see .specify/features/engine-timing/evidence/T005-log-green.txt. Re-sealed in S15 at ea61882: src/react/scene/Scene.tsx — ClockGate: no frames while the engine clock is paused, one repaint of the frozen pose on resize/theme (E2) + test/scene-pause.test.tsx; see .specify/features/engine-timing/evidence/T008-log-green.txt.',
    );
    expect(entries.length).toBeGreaterThanOrEqual(25);

    for (const path of REQUIRED_S6_FILES) {
      expect(manifest.files).toHaveProperty(path);
    }

    for (const [path, expected] of entries) {
      const workingCopy = rawFiles[path];

      if (workingCopy === undefined) throw new Error(`Missing working copy for ${path}`);

      expect(await sha256(workingCopy), path).toBe(expected);
    }
  });
});

describe('frozen S7 surface', () => {
  test('matches every hash recorded from the base commit', async () => {
    const manifest = manifestS7Json as FrozenSurfaceManifest;
    const entries = Object.entries(manifest.files);

    expect(manifest.base).toBe('5b22987');
    expect(manifest.note).toBe(
      'S07 seal, Tier A (S08 RFC D1). Tier B files are edited for a11y only and guarded by the presentation snapshot. A later slice that changes a listed file regenerates this manifest in the same diff and states why.',
    );
    expect(entries.length).toBeGreaterThanOrEqual(20);

    for (const path of REQUIRED_S7_FILES) {
      expect(manifest.files).toHaveProperty(path);
    }

    for (const path of TIER_B_S7_FILES) {
      expect(manifest.files).not.toHaveProperty(path);
    }

    for (const [path, expected] of entries) {
      const workingCopy = rawFiles[path];

      if (workingCopy === undefined) throw new Error(`Missing working copy for ${path}`);

      expect(await sha256(workingCopy), path).toBe(expected);
    }
  });
});

describe('frozen S8 surface', () => {
  test('matches every hash recorded from the base commit', async () => {
    const manifest = manifestS8Json as FrozenSurfaceManifest;
    const entries = Object.entries(manifest.files);

    expect(manifest.base).toBe('5d3abdb');
    expect(manifest.note).toBe(
      "S08 seal (S10 RFC D13). S10 changes no xploder source; a later slice that changes a listed file regenerates this manifest in the same diff and states why. Re-sealed in S11.6 at 405bca1: src/react/TeardownViewer.tsx — async renderer factory: WebGLRenderer construction in its own idle slice (S11.6 L1); see .specify/features/staged-canvas-mount/evidence/T005-log-l1-ab.md. Fixed at 1a99569: default-lane re-render when the staged renderer settles (S11.6 L1, D-P3). L4 at 0ac2148: R3F configuration in the next task (S11.6 L4). Compacted at 470acd8 (S11.6 T008b, bytes). Re-sealed in S14 at edde9d0: src/react/TeardownViewer.tsx — the open detail panel is the selected emphasis; open/close highlight sync keeps hover and keyboard focus; data-xploder-selected (I-09); see .specify/features/engine-polish/evidence/T003-log-reseal.txt. Re-sealed in S15 at 74394e9: src/react/TeardownViewer.tsx + src/react/panel/PanelLayer.tsx — the Scene runs on the viewer's engine clock; panel event cutoff via hostNow() (E1); see .specify/features/engine-timing/evidence/T006-log-ac1-scan.txt. Re-sealed in S15 at 5d3abdb: src/react/TeardownViewer.tsx — tour commands and the case-study auto-pause use pauseTour() (tourCommandActionsOf adapter; S7 executeTourCommand unchanged) (E2); see .specify/features/engine-timing/evidence/T007-log-callers.txt.",
    );
    expect(entries.length).toBeGreaterThanOrEqual(16);

    for (const path of REQUIRED_S8_FILES) {
      expect(manifest.files).toHaveProperty(path);
    }

    for (const [path, expected] of entries) {
      const workingCopy = rawFiles[path];

      if (workingCopy === undefined) throw new Error(`Missing working copy for ${path}`);

      expect(await sha256(workingCopy), path).toBe(expected);
    }
  });
});
