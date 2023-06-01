import { APIRequestContext, expect } from '@playwright/test';

export const reseed = async (request: APIRequestContext) => {
  const response = await request.get('http://localhost:9999/testingOnly/reseed');
  expect(response.status()).toBe(200);
  return response;
};