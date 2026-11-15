import ReactThreeTestRenderer from '@react-three/test-renderer';
import { expect, test, vi } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

test('mounting an R3F root does not construct a deprecated Clock', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  let renderer: Awaited<ReturnType<typeof ReactThreeTestRenderer.create>> | undefined;

  try {
    renderer = await ReactThreeTestRenderer.create(<mesh />);
  } finally {
    await renderer?.unmount();
  }

  const clockWarnings = warn.mock.calls.filter((args) => args.join(' ').includes('THREE.Clock'));
  warn.mockRestore();

  expect(clockWarnings).toEqual([]);
});
