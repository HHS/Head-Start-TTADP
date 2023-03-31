import { test, expect } from '@playwright/test';
import Joi from 'joi';
import { root } from './common';

test('get /settings', async ({ request }) => {
  const response = await request.get(`${root}/settings`);
  const body = await response.body();

  const schema = Joi.array().items(
    Joi.object({
      key: Joi.string().valid(
        'emailWhenReportSubmittedForReview',
        'emailWhenChangeRequested',
        'emailWhenReportApproval',
        'emailWhenAppointedCollaborator',
        'emailWhenRecipientReportApprovedProgramSpecialist'
      ).required(),
      value: Joi.string().valid('never', 'immediately', 'today', 'this week', 'this month').required(),
    })
  );

  const json = JSON.parse(String(body));
  const { error } = schema.validate(json);
  expect(error).toBe(undefined);
});

/**
 * This test is currently indentical to the one above, but once
 * we start adding settings that are outside the scope of email,
 * we'll need these two separate tests.
 */
test('get /settings/email', async ({ request }) => {
  const response = await request.get(`${root}/settings`);
  const body = await response.body();

  const schema = Joi.array().items(
    Joi.object({
      key: Joi.string().valid(
        'emailWhenReportSubmittedForReview',
        'emailWhenChangeRequested',
        'emailWhenReportApproval',
        'emailWhenAppointedCollaborator',
        'emailWhenRecipientReportApprovedProgramSpecialist'
      ).required(),
      value: Joi.string().valid('never', 'immediately', 'today', 'this week', 'this month').required(),
    })
  );

  const json = JSON.parse(String(body));
  const { error } = schema.validate(json);
  expect(error).toBe(undefined);
});

test('put /settings', async ({ request }) => {
  const response = await request.put(
    `${root}/settings`,
    {
      data: [
        { key: 'emailWhenReportSubmittedForReview', value: 'never' },
        { key: 'emailWhenChangeRequested', value: 'never' },
      ],
      headers: {
        'Content-Type': 'application/json',
      }
    },
  );
  expect(response.status()).toBe(204);
});

test('put /settings/email/unsubscribe', async ({ request }) => {
  const response = await request.put(
    `${root}/settings/email/unsubscribe`,
  );

  expect(response.status()).toBe(204);
});

test('put /settings/email/subscribe', async ({ request }) => {
  const response = await request.put(
    `${root}/settings/email/subscribe`,
  );

  expect(response.status()).toBe(204);
});