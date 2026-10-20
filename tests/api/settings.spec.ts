import { expect, test } from '@playwright/test';
import Joi from 'joi';
import {
  EMAIL_NOTIFICATION_SETTING_KEYS,
  IN_APP_NOTIFICATION_SETTING_KEYS,
} from '../../src/constants';
import { root, validateSchema } from './common';

test('get /settings', async ({ request }) => {
  const response = await request.get(`${root}/settings`);
  const schema = Joi.array().items(
    Joi.alternatives().try(
      Joi.object({
        key: Joi.string()
          .valid(...EMAIL_NOTIFICATION_SETTING_KEYS)
          .required(),
        value: Joi.string()
          .valid('never', 'immediately', 'today', 'this week', 'this month')
          .required(),
      }),
      Joi.object({
        key: Joi.string()
          .valid(...IN_APP_NOTIFICATION_SETTING_KEYS)
          .required(),
        value: Joi.boolean().required(),
      })
    )
  );

  await validateSchema(response, schema, expect);
});

/**
 * This test validates only the email settings endpoint, which returns
 * only email-class settings.
 */
test('get /settings/email', async ({ request }) => {
  const response = await request.get(`${root}/settings/email`);

  const schema = Joi.array().items(
    Joi.alternatives().try(
      Joi.object({
        key: Joi.string()
          .valid(...EMAIL_NOTIFICATION_SETTING_KEYS)
          .required(),
        value: Joi.string()
          .valid('never', 'immediately', 'today', 'this week', 'this month')
          .required(),
      })
    )
  );

  await validateSchema(response, schema, expect);
});

test('put /settings', async ({ request }) => {
  const response = await request.put(`${root}/settings`, {
    data: [
      { key: 'emailWhenReportSubmittedForReview', value: 'never' },
      { key: 'emailWhenChangeRequested', value: 'never' },
    ],
    headers: {
      'Content-Type': 'application/json',
    },
  });
  expect(response.status()).toBe(204);
});

test('put /settings/email/unsubscribe', async ({ request }) => {
  const response = await request.put(`${root}/settings/email/unsubscribe`);

  expect(response.status()).toBe(204);
});

test('put /settings/email/subscribe', async ({ request }) => {
  const response = await request.put(`${root}/settings/email/subscribe`);

  expect(response.status()).toBe(204);
});
