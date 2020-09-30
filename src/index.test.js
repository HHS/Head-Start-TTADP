import request from 'supertest';
import app from './app';

describe('Root', () => {
  test('Responds with a 401 (Unauthorized) if user is not logged in', async () => {
    const response = await request(app).get('/api');
    expect(response.status).toBe(401);
  });
});
