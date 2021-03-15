import app from '../app';

const request = require('supertest');

describe('apiDirectory tests', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.BYPASS_AUTH = 'true';
    process.env.CURRENT_USER_ID = 100;
  });
  it('tests the hello route', async () => {
    await request(app)
      .get('/api/hello')
      .expect(200)
      .then((res) => {
        expect(res.text).toBe('Hello from ttadp');
      });
  });
  it('tests an unknown route', async () => {
    await request(app)
      .get('/api/unknown')
      .then((res) => {
        expect(res.statusCode).toBe(404);
      });
  });
  it('tests the logout route', async () => {
    await request(app)
      .get('/api/logout')
      .then((res) => {
        expect(res.statusCode).toBe(204);
      });
  });
});
