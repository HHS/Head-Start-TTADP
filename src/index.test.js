import request from 'supertest';
import app from './app';

describe('Root', () => {
  test('Successfully returns the page', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
  });
});
