import { expect, test } from 'vitest';
import { z } from 'zod';

import { ProjectSchema } from '../src/index';

test('exports the v1 project schema fingerprint', () => {
  expect(z.toJSONSchema(ProjectSchema, { io: 'input' })).toMatchSnapshot('project-schema-v1');
});
