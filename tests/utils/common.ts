import { APIRequestContext, expect } from '@playwright/test';

export const reseed = async (request: APIRequestContext) => {
  const response = await request.get('http://localhost:9999/testingOnly/reseed');
  expect(response.status()).toBe(200);
  return response;
};

export const query = async (request: APIRequestContext, command: string) => {
  // make a post request with this command body:
  const response = await request.post(
    'http://localhost:9999/testingOnly/query',
    {
      data: {
        command,
      },
    },
  );
  expect(response.status()).toBe(200);
  return response;
};