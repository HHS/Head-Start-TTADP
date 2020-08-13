const request = require('supertest');
const app = require('./app');

describe('Root', () => {
  test('Returns a 200', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
  });
});
