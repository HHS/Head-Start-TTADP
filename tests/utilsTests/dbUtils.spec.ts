import { test, expect } from '@playwright/test';

test.describe('get /query', () => {

  test('/', async ({ request }) => {
    let response = await request.post(
      'testingOnly/query/',
      {
        data: {
          command: 'ALTER SEQUENCE "Goals_id_seq" RESTART WITH 65535;',
        },
      },
    );

    expect(response.status()).toBe(200);

    response = await request.get('testingOnly/reseed/', { timeout: 600_000 });
    expect(response.status()).toBe(200);

    response = await request.post(
      'testingOnly/query/',
      {
        data: {
          command: 'SELECT last_value AS "lastValue" FROM "Goals_id_seq";',
        },
      },
    );
    expect(response.status()).toBe(200);
    expect(response.body).not.toBe(65_535);
  });
});
