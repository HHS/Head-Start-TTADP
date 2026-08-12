import fetchMock from 'fetch-mock';
import { HTTPError, post } from '../index';

describe('fetch helpers', () => {
  afterEach(() => {
    fetchMock.restore();
  });

  const capturePostError = async (url) => {
    try {
      await post(url, { example: true });
      return null;
    } catch (error) {
      return error;
    }
  };

  it('preserves a structured JSON error response from POST requests', async () => {
    const responseBody = {
      code: 'STANDARD_GOAL_ON_ACTIVITY_REPORT',
      blockingActivityReports: [
        {
          displayId: 'R14-AR-67433',
          creatorName: 'Annika Lewis, GS',
          href: '/activity-reports/123',
        },
      ],
    };
    fetchMock.post('/api/test', {
      body: responseBody,
      status: 409,
    });

    const error = await capturePostError('/api/test');

    expect(error).toBeInstanceOf(HTTPError);
    expect(error.status).toBe(409);
    expect(error.data).toEqual(responseBody);
  });

  it('preserves the HTTP status when an error response has an empty body', async () => {
    fetchMock.post('/api/empty-error', {
      body: '',
      status: 500,
    });

    const error = await capturePostError('/api/empty-error');

    expect(error).toBeInstanceOf(HTTPError);
    expect(error.status).toBe(500);
  });

  it('preserves the HTTP status when an error response is not valid JSON', async () => {
    fetchMock.post('/api/plain-error', {
      body: 'Internal server error',
      headers: { 'Content-Type': 'application/json' },
      status: 502,
    });

    const error = await capturePostError('/api/plain-error');

    expect(error).toBeInstanceOf(HTTPError);
    expect(error.status).toBe(502);
  });

  it('returns a successful response without consuming its JSON body', async () => {
    fetchMock.post('/api/success', {
      body: { id: 123 },
      status: 201,
    });

    const response = await post('/api/success', { example: true });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ id: 123 });
  });
});
