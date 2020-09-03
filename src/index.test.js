import request from 'supertest';
import app from './app';

describe('Root', () => {
  test('Redirects to login if user is not logged in', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(302);
  });
});
