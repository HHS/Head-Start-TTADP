import { test, expect } from '@playwright/test';
import Joi from '@hapi/joi';
import { root, validateSchema } from './common';

test.describe('get /users/collaborators', () => {
  test('no region - 403 case', async ({ request }) => {
    const response = await request.get(`${root}/users/collaborators`);
    expect(response.status()).toBe(403);
  });

  test('no access to region - 403 case', async ({ request }) => {
    const response = await request.get(`${root}/users/collaborators?region=14`);
    expect(response.status()).toBe(403);
  });

  test('home region - 200 case', async ({ request }) => {
    const response = await request.get(
      `${root}/users/collaborators?region=14`,
      { headers: { 'playwright-user-id': '1' } }
    );
    expect(response.status()).toBe(200);
    const schema = Joi.array().items(Joi.any());
    await validateSchema(response, schema, expect);
  });
});

test.describe('get /users/stateCodes', () => {
  test('200', async ({ request }) => {
    const response = await request.get(`${root}/users/stateCodes`);
    expect(response.status()).toBe(200);
  });
  test('403', async ({ request }) => {
    const response = await request.get(
      `${root}/users/stateCodes`,
      { headers: { 'playwright-user-id': '2' } }, // has no home region
    );
    expect(response.status()).toBe(403);
  });
});

test.describe('get /users/statistics', () => {
  test('200', async ({ request }) => {
    const response = await request.get(`${root}/users/statistics`);
    const schema = Joi.object({
      daysSinceJoined: Joi.string().required(),
      arsCreated: Joi.string().required(),
      arsCollaboratedOn: Joi.string().required(),
      ttaProvided: Joi.string().required(),
      recipientsReached: Joi.string().required(),
      grantsServed: Joi.string().required(),
      participantsReached: Joi.string().required(),
      goalsApproved: Joi.string().required(),
      objectivesApproved: Joi.string().required(),
    });
    expect(response.status()).toBe(200);
    await validateSchema(response, schema, expect);
  });
  test('403', async ({ request }) => {
    const response = await request.get(
      `${root}/users/statistics`,
      { headers: { 'playwright-user-id': '2' } }, // has no home region
    );
    expect(response.status()).toBe(403);
  });
});

test.describe('get /users/active-users', () => {
  test('403', async ({ request }) => {
    const response = await request.get(`${root}/users/active-users`);
    expect(response.status()).toBe(403);
  });
  test('200', async ({ request }) => {
    const response = await request.get(
      `${root}/users/active-users`,
      { headers: { 'playwright-user-id': '1' } }, // has no home region
    );
    expect(response.status()).toBe(200);

    // ensure response header content-type is 'text/csv':
    expect(response.headers()['content-type']).toBe('text/csv; charset=utf-8');
  });
});

test.describe('get /users/training-report-users', () => {
  test('403', async ({ request }) => {
    const response = await request.get(`${root}/users/training-report-users`);
    expect(response.status()).toBe(403);
  });
  test('200', async ({ request }) => {
    const response = await request.get(
      `${root}/users/training-report-users?regionId=1`,
      { headers: { 'playwright-user-id': '1' } }, // has no home region
    );
    expect(response.status()).toBe(200);

    const schema = Joi.object({
      pointOfContact: Joi.array().items(Joi.any()),
      collaborators: Joi.array().items(Joi.any()),
      creators: Joi.array().items(Joi.any()),
    });
    expect(response.status()).toBe(200);
    await validateSchema(response, schema, expect);
  });
});

test.describe('get /users/names', () => {
  test('400', async ({ request }) => {
    const response = await request.get(`${root}/users/names`);
    expect(response.status()).toBe(400);
  });
  test('200', async ({ request }) => {
    const response = await request.get(
      `${root}/users/names?ids=1&ids=2`,
      { headers: { 'playwright-user-id': '1' } }, // has no home region
    );
    expect(response.status()).toBe(200);

    const schema = Joi.array().items(Joi.any());
    expect(response.status()).toBe(200);
    await validateSchema(response, schema, expect);
  });
});