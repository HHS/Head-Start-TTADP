import { test, expect } from '@playwright/test';

test.describe('get /role', () => {

  test('/', async ({ request }) => {
    let data = { data: { command: `
    ALTER SEQUENCE "Goals_id_seq"
    RESTART WITH 65535;
    `} };
    let response = await request.get(`testingOnly/query/`, data);
    expect(response.status()).toBe(200);

    response = await request.get(`testingOnly/reseed/`);
    expect(response.status()).toBe(200);
    expect(response.body).toBe(true);

    data = { data: { command: `
    SELECT last_value AS "lastValue"
    FROM "Goals_id_seq";
    `} };
    response = await request.get(`testingOnly/query/`, data);
    expect(response.status()).toBe(200);
    expect(response.body).not.toBe(65535);
  });
});
