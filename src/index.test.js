import request from 'supertest';
import server from './index';

describe('Root', () => {
  test('Responds with a 401 (Unauthorized) if user is not logged in', async () => {
    const response = await request(server).get('/');
    expect(response.status).toBe(401);
  });
  afterAll(async () => {
    await server.close();
  });
});
