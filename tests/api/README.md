# API tests

These API tests use Playwright for making requests to the API and Joi for validating the responses. They run alongside the rest of the end-to-end tests during the same stage in CI.

#  Writing tests

`tests/api/common.ts` contains some common helpers for making requests and doing the validations.

There are a number of examples of writing tests in here, but the basic pattern is:

```typescript
import { test, expect } from '@playwright/test';
import Joi from '@hapi/joi';
import { root, validateSchema } from './common';

test('get /endpoint', async ({ request }) => {
  const response = await request.get(`${root}/endpoint`);

  const schema = Joi.array().items(
    Joi.object({
      key: Joi.string().valid(
        'keyA',
        'keyB',
        'keyC',
      ).required(),
      value: Joi.string().valid('valA', 'valB', 'valC').required(),
    })
  );

  await validateSchema(response, schema, expect);
});
```