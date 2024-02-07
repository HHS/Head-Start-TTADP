import request from 'supertest';
import app from './app';

describe('Root', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules(); // clear the cache
    process.env = { ...ORIGINAL_ENV }; // make a copy
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV; // restore original env
  });

  test('Responds with a 401 (Unauthorized) if user is not logged in', async () => {
    // Ensure authorization is required, do not bypass authorization check
    process.env.NODE_ENV = 'test';
    process.env.BYPASS_AUTH = 'false';

    const response = await request(app).get('/api');
    expect(response.status).toBe(401);
  });
});
