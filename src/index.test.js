import request from 'supertest';
import server from './index';

describe('Root', () => {
  test('Returns a 200', async () => {
    const response = await request(server).get('/');
    expect(response.status).toBe(200);
  });
  afterAll(async () => {
    await server.close();
  });
});
