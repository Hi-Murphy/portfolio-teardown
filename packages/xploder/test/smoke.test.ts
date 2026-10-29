import { expect, test } from 'vitest';

import { XPLODER_VERSION } from '../src/index';

test('exports the package version', () => {
  expect(XPLODER_VERSION).toBe('0.0.0');
});
