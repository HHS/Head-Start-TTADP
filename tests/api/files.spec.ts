import { test, expect } from '@playwright/test';
import Joi from 'joi';
import { validate } from 'uuid';
import { root, validateSchema } from './common';

test.describe('/files', () => {

  test('post /', async ({ request }) => {
    const reportId = 10_000;
    const reportObjectiveId = 1;
    const objectiveId = 1;
    const objectiveTemplateId = 1;

    const response = await request.post(
      `${root}/files`,
      {
        multipart: {
          reportId,
          reportObjectiveId,
          objectiveId,
          objectiveTemplateId,
          file: {
            name: 'file.txt',
            mimeType: 'text/plain',
            buffer: Buffer.from('Hello World'),
          },
        },
        headers: {
          'playwright-user-id': '1',
        },
      },
    );

    expect(response.status()).toBe(200);
  });

  test('post /objectives', async ({ request }) => {
    const reportId = 10_000;
    const reportObjectiveId = 1;
    const objectiveId = 1;
    const objectiveTemplateId = 1;

    const response = await request.post(
      `${root}/files`,
      {
        multipart: {
          reportId,
          reportObjectiveId,
          objectiveId,
          objectiveTemplateId,
          file: {
            name: 'file.txt',
            mimeType: 'text/plain',
            buffer: Buffer.from('Hello World'),
          },
        },
        headers: {
          'playwright-user-id': '1',
        },
      },
    );

    expect(response.status()).toBe(200);
  });

});
