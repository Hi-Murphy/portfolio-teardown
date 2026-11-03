import { describe, expect, test } from 'vitest';

import { waitForFirstInteraction, waitForIdle } from '../components/interaction-gate';

describe('interaction gates', () => {
  test('return false when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(waitForFirstInteraction(controller.signal)).resolves.toBe(false);
    await expect(waitForIdle(controller.signal)).resolves.toBe(false);
  });
});
