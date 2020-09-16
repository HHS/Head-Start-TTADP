import request from 'supertest';
import server from './index';

describe('Root', () => {
  test('Redirects to login if user is not logged in', async () => {
    const response = await request(server).get('/');
    expect(response.status).toBe(302);
  });
  afterAll(async () => {
    await server.close();
  });
});
