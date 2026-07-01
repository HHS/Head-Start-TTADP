import { expect, test } from '@playwright/test';
import Joi from 'joi';
import { root, validateSchema } from './common';

test('get /settings', async ({ request }) => {
  const response = await request.get(`${root}/settings`);
  const schema = Joi.array().items(
    Joi.alternatives().try(
      Joi.object({
        key: Joi.string()
          .valid(
            'emailWhenReportSubmittedForReview',
            'emailWhenChangeRequested',
            'emailWhenReportApproval',
            'emailWhenAppointedCollaborator',
            'emailWhenRecipientReportApprovedProgramSpecialist'
          )
          .required(),
        value: Joi.string()
          .valid('never', 'immediately', 'today', 'this week', 'this month')
          .required(),
      }),
      Joi.object({
        key: Joi.string()
          .valid(
            'inAppWhenReportSubmittedForReview',
            'inAppWhenChangeRequested',
            'inAppWhenReportApproval',
            'inAppWhenAppointedCollaborator',
            'inAppWhenCollabReportSubmittedForReview',
            'inAppWhenRecipientReportApprovedProgramSpecialist',
            'inAppWhenCollaboratorReportSubmittedForReview',
            'inAppWhenCreatorReportSubmittedForReview',
            'inAppWhenCollaborationReportSubmittedForReview',
            'inAppWhenCollaborationReportCollaboratorSubmitted',
            'inAppWhenCollaborationChangeRequested',
            'inAppWhenCollaborationReportApproved',
            'inAppWhenAddedAsCollaborationCollaborator',
            'inAppWhenAddedAsTTAStaffCommLog',
            'inAppWhenAddedAsRecipientCommLog',
            'inAppWhenAddedAsPocTrainingReport',
            'inAppWhenAddedAsCollaboratorTrainingReport',
            'inAppWhenSessionReviewRequestedTrainingReport',
            'inAppWhenSessionChangesRequestedTrainingReport',
            'inAppWhenSessionDetails20DaysCreatorCollaborator',
            'inAppWhenSessionDetails20DaysPoc',
            'inAppWhenNoSessionsCreatorCollaborator',
            'inAppWhenNoSessionsPoc',
            'inAppWhenEventDetails20DaysCreatorCollaborator',
            'inAppWhenEventNotCompleted',
            'inAppWhenPlannedOutage',
            'inAppWhenMonitoringDetailsAdded',
            'inAppWhenAddedAsCoOwner',
            'inAppWhenSharedMyGroup'
          )
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
          .valid(
            'emailWhenReportSubmittedForReview',
            'emailWhenChangeRequested',
            'emailWhenReportApproval',
            'emailWhenAppointedCollaborator',
            'emailWhenRecipientReportApprovedProgramSpecialist'
          )
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
