import express from 'express';
import request from 'supertest';
import { checkRecipientAccessAndExistence } from '../utils';
import router from './index';

jest.mock('../transactionWrapper', () =>
  jest.fn(
    (handler) =>
      async function wrapper(req, res, next) {
        return handler(req, res, next);
      }
  )
);
jest.mock('../utils');

describe('recipient routes', () => {
  const app = express();
  app.use('/recipient', router);

  beforeEach(() => {
    jest.clearAllMocks();
    checkRecipientAccessAndExistence.mockResolvedValue(true);
  });

  it('wires the timeline handler behind recipient, region, and query validation', () => {
    const timelineRoute = router.stack.find(
      (layer) => layer.route?.path === '/:recipientId/region/:regionId/timeline'
    );

    expect(timelineRoute).toBeDefined();
    expect(timelineRoute.route.methods.get).toBe(true);
    expect(timelineRoute.route.stack.map((layer) => layer.name)).toEqual([
      'checkRecipientIdParam',
      'checkRegionIdParam',
      'checkRecipientTimelineQuery',
      'wrapper',
    ]);
  });

  it('returns the empty contract through the timeline route', async () => {
    const response = await request(app)
      .get('/recipient/100000/region/1/timeline')
      .query({ limit: 25, offset: 10, sortBy: 'date', direction: 'asc' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      count: 0,
      events: [],
    });
  });

  it.each([
    '/recipient/not-a-number/region/1/timeline',
    '/recipient/100000/region/not-a-number/timeline',
    '/recipient/100000/region/1e1/timeline',
  ])('rejects invalid path parameters for %s', async (path) => {
    const response = await request(app).get(path);

    expect(response.status).toBe(400);
    expect(checkRecipientAccessAndExistence).not.toHaveBeenCalled();
  });

  it('rejects invalid query parameters before calling the handler', async () => {
    const response = await request(app).get('/recipient/100000/region/1/timeline?limit=0');

    expect(response.status).toBe(400);
    expect(checkRecipientAccessAndExistence).not.toHaveBeenCalled();
  });
});
