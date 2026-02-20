import { format, subDays } from 'date-fns';
import { TRAINING_REPORT_STATUSES } from '@ttahub/common';
import { trainingReportTaskDueNotifications } from '.';
import { userById } from '../../services/users';
import { getTrainingReportAlerts } from '../../services/event';
import { EMAIL_DIGEST_FREQ } from '../../constants';

jest.mock('bull');
jest.mock('../../services/event', () => ({ getTrainingReportAlerts: jest.fn() }));
jest.mock('../../services/users', () => ({ userById: jest.fn() }));

describe('trainingReportTaskDueNotifications', () => {
  const today = format(new Date(), 'MM/dd/yyyy');

  it('requires a date', async () => {
    await expect(trainingReportTaskDueNotifications()).rejects.toThrow('date is null');
  });

  it('handles invalid alert type', async () => {
    getTrainingReportAlerts.mockResolvedValue([
      // 20 days past event startDate: should send email
      {
        id: 1,
        eventId: 'RO1-012-1234',
        eventName: 'Event 1',
        alertType: 'somethingRottenInDenmarkProbably',
        sessionName: '',
        isSession: false,
        ownerId: 1,
        pocIds: [2],
        collaboratorIds: [3],
        startDate: format(subDays(new Date(), 20), 'MM/dd/yyyy'),
        endDate: today,
      },
    ]);

    userById.mockResolvedValue({ id: 1, email: 'email@email.com' });

    const emails = await trainingReportTaskDueNotifications(EMAIL_DIGEST_FREQ.DAILY);

    expect(emails).toEqual([]);
  });

  it('adds noSessionsCreated jobs to the queue', async () => {
    getTrainingReportAlerts.mockResolvedValue([
      // 20 days past event endDate: should send email
      {
        id: 1,
        eventId: 'RO1-012-1234',
        eventName: 'Event 1',
        alertType: 'noSessionsCreated',
        sessionName: '',
        isSession: false,
        ownerId: 1,
        pocIds: [2],
        collaboratorIds: [3, 4],
        startDate: format(subDays(new Date(), 20), 'MM/dd/yyyy'),
        endDate: format(subDays(new Date(), 20), 'MM/dd/yyyy'),
        eventStatus: TRAINING_REPORT_STATUSES.IN_PROGRESS,
        sessionId: false,
      },
      // end Date is today, no email
      {
        id: 2,
        eventId: 'RO1-012-1235',
        eventName: 'Event 2',
        alertType: 'noSessionsCreated',
        sessionName: '',
        isSession: false,
        ownerId: 1,
        pocIds: [2],
        collaboratorIds: [3],
        startDate: today,
        endDate: today,
        eventStatus: TRAINING_REPORT_STATUSES.IN_PROGRESS,
        sessionId: false,
      },
      // 30 days past event endDate: don't send email
      {
        id: 3,
        eventId: 'RO1-012-1236',
        eventName: 'Event 3',
        alertType: 'noSessionsCreated',
        sessionName: '',
        isSession: false,
        ownerId: 1,
        pocIds: [2],
        collaboratorIds: [3],
        startDate: format(subDays(new Date(), 30), 'MM/dd/yyyy'),
        endDate: format(subDays(new Date(), 30), 'MM/dd/yyyy'),
        eventStatus: TRAINING_REPORT_STATUSES.IN_PROGRESS,
        sessionId: false,
      },
      // 43 days past event enddate: don't send email
      {
        id: 4,
        eventId: 'RO1-012-1237',
        eventName: 'Event 4',
        alertType: 'noSessionsCreated',
        sessionName: '',
        isSession: false,
        ownerId: 1,
        pocIds: [2],
        collaboratorIds: [3],
        startDate: format(subDays(new Date(), 43), 'MM/dd/yyyy'),
        endDate: format(subDays(new Date(), 43), 'MM/dd/yyyy'),
        eventStatus: TRAINING_REPORT_STATUSES.IN_PROGRESS,
        sessionId: false,
      },
      // 40 days past event end date: should send email
      {
        id: 5,
        eventId: 'RO1-012-1238',
        eventName: 'Event 5',
        alertType: 'noSessionsCreated',
        sessionName: '',
        isSession: false,
        ownerId: 1,
        pocIds: [2],
        collaboratorIds: [3],
        startDate: format(subDays(new Date(), 40), 'MM/dd/yyyy'),
        endDate: format(subDays(new Date(), 40), 'MM/dd/yyyy'),
        eventStatus: TRAINING_REPORT_STATUSES.IN_PROGRESS,
        sessionId: false,
      },
      // 60 days past event enddate: should send email
      {
        id: 6,
        eventId: 'RO1-012-1239',
        eventName: 'Event 6',
        alertType: 'noSessionsCreated',
        sessionName: '',
        isSession: false,
        ownerId: 1,
        pocIds: [2],
        collaboratorIds: [3],
        startDate: format(subDays(new Date(), 60), 'MM/dd/yyyy'),
        endDate: format(subDays(new Date(), 60), 'MM/dd/yyyy'),
        eventStatus: TRAINING_REPORT_STATUSES.IN_PROGRESS,
        sessionId: false,
      },
      // missing end date, no email
      {
        id: 7,
        eventId: 'RO1-012-1240',
        eventName: 'Event 7',
        alertType: 'noSessionsCreated',
        sessionName: '',
        isSession: false,
        ownerId: 1,
        pocIds: [2],
        collaboratorIds: [3],
        startDate: '',
        endDate: '',
        eventStatus: TRAINING_REPORT_STATUSES.IN_PROGRESS,
        sessionId: false,
      },
    ]);

    userById.mockResolvedValue({ id: 1, email: 'email@email.com' });

    const emails = await trainingReportTaskDueNotifications(EMAIL_DIGEST_FREQ.DAILY);

    expect(emails).toEqual([
      {
        debugMessage: 'MAILER: Notifying email@email.com that no sessions have been created for TR RO1-012-1234',
        displayId: 'RO1-012-1234',
        report: {
          displayId: 'RO1-012-1234',
        },
        emailTo: [
          'email@email.com',
        ],
        prefix: 'Reminder:',
        reportPath: 'http://localhost:3000/training-reports/in-progress',
        templatePath: 'tr_owner_reminder_no_sessions',
      },
      {
        debugMessage: 'MAILER: Notifying email@email.com that no sessions have been created for TR RO1-012-1234',
        displayId: 'RO1-012-1234',
        report: {
          displayId: 'RO1-012-1234',
        },
        emailTo: [
          'email@email.com',
        ],
        prefix: 'Reminder:',
        reportPath: 'http://localhost:3000/training-reports/in-progress',
        templatePath: 'tr_collaborator_reminder_no_sessions',
      },
      {
        debugMessage: 'MAILER: Notifying email@email.com that no sessions have been created for TR RO1-012-1234',
        displayId: 'RO1-012-1234',
        report: {
          displayId: 'RO1-012-1234',
        },
        emailTo: [
          'email@email.com',
        ],
        prefix: 'Reminder:',
        reportPath: 'http://localhost:3000/training-reports/in-progress',
        templatePath: 'tr_collaborator_reminder_no_sessions',
      },
      {
        debugMessage: 'MAILER: Notifying email@email.com that no sessions have been created for TR RO1-012-1238',
        displayId: 'RO1-012-1238',
        report: {
          displayId: 'RO1-012-1238',
        },
        emailTo: [
          'email@email.com',
        ],
        prefix: 'Past due:',
        reportPath: 'http://localhost:3000/training-reports/in-progress',
        templatePath: 'tr_owner_reminder_no_sessions',
      },
      {
        debugMessage: 'MAILER: Notifying email@email.com that no sessions have been created for TR RO1-012-1238',
        displayId: 'RO1-012-1238',
        report: {
          displayId: 'RO1-012-1238',
        },
        emailTo: [
          'email@email.com',
        ],
        prefix: 'Past due:',
        reportPath: 'http://localhost:3000/training-reports/in-progress',
        templatePath: 'tr_collaborator_reminder_no_sessions',
      },
      {
        debugMessage: 'MAILER: Notifying email@email.com that no sessions have been created for TR RO1-012-1239',
        displayId: 'RO1-012-1239',
        report: {
          displayId: 'RO1-012-1239',
        },
        emailTo: [
          'email@email.com',
        ],
        prefix: 'Past due:',
        reportPath: 'http://localhost:3000/training-reports/in-progress',
        templatePath: 'tr_owner_reminder_no_sessions',
      },
      {
        debugMessage: 'MAILER: Notifying email@email.com that no sessions have been created for TR RO1-012-1239',
        displayId: 'RO1-012-1239',
        report: {
          displayId: 'RO1-012-1239',
        },
        emailTo: [
          'email@email.com',
        ],
        prefix: 'Past due:',
        reportPath: 'http://localhost:3000/training-reports/in-progress',
        templatePath: 'tr_collaborator_reminder_no_sessions',
      },
    ]);
  });

  it('adds missingEventInfo jobs to the queue', async () => {
    getTrainingReportAlerts.mockResolvedValue([
      // 20 days past event startDate: should send email
      {
        id: 1,
        eventId: 'RO1-012-1234',
        eventName: 'Event 1',
        alertType: 'missingEventInfo',
        sessionName: '',
        isSession: false,
        ownerId: 1,
        pocIds: [2],
        collaboratorIds: [3],
        startDate: format(subDays(new Date(), 20), 'MM/dd/yyyy'),
        endDate: today,
        eventStatus: TRAINING_REPORT_STATUSES.IN_PROGRESS,
        sessionId: false,
      },
      // start Date is today, no email
      {
        id: 2,
        eventId: 'RO1-012-1235',
        eventName: 'Event 2',
        alertType: 'missingEventInfo',
        sessionName: '',
        isSession: false,
        ownerId: 1,
        pocIds: [2],
        collaboratorIds: [3],
        startDate: today,
        endDate: today,
        eventStatus: TRAINING_REPORT_STATUSES.IN_PROGRESS,
        sessionId: false,
      },
      // 30 days past event startDate: don't send email
      {
        id: 3,
        eventId: 'RO1-012-1236',
        eventName: 'Event 3',
        alertType: 'missingEventInfo',
        sessionName: '',
        isSession: false,
        ownerId: 1,
        pocIds: [2],
        collaboratorIds: [3],
        startDate: format(subDays(new Date(), 30), 'MM/dd/yyyy'),
        endDate: today,
        eventStatus: TRAINING_REPORT_STATUSES.IN_PROGRESS,
        sessionId: false,
      },
      // 43 days past event startDate: don't send email
      {
        id: 4,
        eventId: 'RO1-012-1237',
        eventName: 'Event 4',
        alertType: 'missingEventInfo',
        sessionName: '',
        isSession: false,
        ownerId: 1,
        pocIds: [2],
        collaboratorIds: [3],
        startDate: format(subDays(new Date(), 43), 'MM/dd/yyyy'),
        endDate: today,
        eventStatus: TRAINING_REPORT_STATUSES.IN_PROGRESS,
        sessionId: false,
      },
      // 40 days past event startDate: should send email
      {
        id: 5,
        eventId: 'RO1-012-1238',
        eventName: 'Event 5',
        alertType: 'missingEventInfo',
        sessionName: '',
        isSession: false,
        ownerId: 1,
        pocIds: [2],
        collaboratorIds: [3],
        startDate: format(subDays(new Date(), 40), 'MM/dd/yyyy'),
        endDate: today,
        eventStatus: TRAINING_REPORT_STATUSES.IN_PROGRESS,
        sessionId: false,
      },
      // 60 days past event startDate: should send email
      {
        id: 6,
        eventId: 'RO1-012-1239',
        eventName: 'Event 6',
        alertType: 'missingEventInfo',
        sessionName: '',
        isSession: false,
        ownerId: 1,
        pocIds: [2],
        collaboratorIds: [3],
        startDate: format(subDays(new Date(), 60), 'MM/dd/yyyy'),
        endDate: today,
        eventStatus: TRAINING_REPORT_STATUSES.IN_PROGRESS,
        sessionId: false,
      },
      // missing start date, no email
      {
        id: 7,
        eventId: 'RO1-012-1240',
        eventName: 'Event 7',
        alertType: 'missingEventInfo',
        sessionName: '',
        isSession: false,
        ownerId: 1,
        pocIds: [2],
        collaboratorIds: [3],
        startDate: '',
        endDate: '',
        eventStatus: TRAINING_REPORT_STATUSES.IN_PROGRESS,
        sessionId: false,
      },
    ]);

    userById.mockResolvedValue({ id: 1, email: 'email@email.com' });

    const emails = await trainingReportTaskDueNotifications(EMAIL_DIGEST_FREQ.DAILY);

    expect(emails).toEqual([
      {
        debugMessage: 'MAILER: Notifying email@email.com that they need to complete event info for TR RO1-012-1234',
        displayId: 'RO1-012-1234',
        report: {
          displayId: 'RO1-012-1234',
        },
        emailTo: [
          'email@email.com',
        ],
        prefix: 'Reminder:',
        reportPath: 'http://localhost:3000/training-report/1234',
        templatePath: 'tr_owner_reminder_event',
      },
      {
        debugMessage: 'MAILER: Notifying email@email.com that they need to complete event info for TR RO1-012-1234',
        displayId: 'RO1-012-1234',
        report: {
          displayId: 'RO1-012-1234',
        },
        emailTo: [
          'email@email.com',
        ],
        prefix: 'Reminder:',
        reportPath: 'http://localhost:3000/training-report/1234',
        templatePath: 'tr_collaborator_reminder_event',
      },
      {
        debugMessage: 'MAILER: Notifying email@email.com that they need to complete event info for TR RO1-012-1238',
        displayId: 'RO1-012-1238',
        report: {
          displayId: 'RO1-012-1238',
        },
        emailTo: [
          'email@email.com',
        ],
        prefix: 'Past due:',
        reportPath: 'http://localhost:3000/training-report/1238',
        templatePath: 'tr_owner_reminder_event',
      },
      {
        debugMessage: 'MAILER: Notifying email@email.com that they need to complete event info for TR RO1-012-1238',
        displayId: 'RO1-012-1238',
        report: {
          displayId: 'RO1-012-1238',
        },
        emailTo: [
          'email@email.com',
        ],
        prefix: 'Past due:',
        reportPath: 'http://localhost:3000/training-report/1238',
        templatePath: 'tr_collaborator_reminder_event',
      },
      {
        debugMessage: 'MAILER: Notifying email@email.com that they need to complete event info for TR RO1-012-1239',
        displayId: 'RO1-012-1239',
        report: {
          displayId: 'RO1-012-1239',
        },
        emailTo: [
          'email@email.com',
        ],
        prefix: 'Past due:',
        reportPath: 'http://localhost:3000/training-report/1239',
        templatePath: 'tr_owner_reminder_event',
      },
      {
        debugMessage: 'MAILER: Notifying email@email.com that they need to complete event info for TR RO1-012-1239',
        displayId: 'RO1-012-1239',
        report: {
          displayId: 'RO1-012-1239',
        },
        emailTo: [
          'email@email.com',
        ],
        prefix: 'Past due:',
        reportPath: 'http://localhost:3000/training-report/1239',
        templatePath: 'tr_collaborator_reminder_event',
      },
    ]);
  });
  it('adds missingSessionInfo jobs to the queue', async () => {
    getTrainingReportAlerts.mockResolvedValue([
      // 20 days past session startDate: should send email
      {
        id: 1,
        eventId: 'RO1-012-1234',
        eventName: 'Event 1',
        alertType: 'missingSessionInfo',
        sessionName: '',
        isSession: false,
        ownerId: 1,
        pocIds: [2, 4],
        collaboratorIds: [3],
        startDate: format(subDays(new Date(), 20), 'MM/dd/yyyy'),
        endDate: today,
        eventStatus: TRAINING_REPORT_STATUSES.IN_PROGRESS,
        sessionId: 1,
      },
      // start Date is today, no email
      {
        id: 2,
        eventId: 'RO1-012-1235',
        eventName: 'Event 2',
        alertType: 'missingSessionInfo',
        sessionName: '',
        isSession: false,
        ownerId: 1,
        pocIds: [2],
        collaboratorIds: [3],
        startDate: today,
        endDate: today,
        eventStatus: TRAINING_REPORT_STATUSES.IN_PROGRESS,
        sessionId: 2,
      },
      // 30 days past session startDate: don't send email
      {
        id: 3,
        eventId: 'RO1-012-1236',
        eventName: 'Event 3',
        alertType: 'missingSessionInfo',
        sessionName: '',
        isSession: false,
        ownerId: 1,
        pocIds: [2, 4],
        collaboratorIds: [3],
        startDate: format(subDays(new Date(), 30), 'MM/dd/yyyy'),
        endDate: today,
        eventStatus: TRAINING_REPORT_STATUSES.IN_PROGRESS,
        sessionId: 3,
      },
      // 43 days past session startDate: don't send email
      {
        id: 4,
        eventId: 'RO1-012-1237',
        eventName: 'Event 4',
        alertType: 'missingSessionInfo',
        sessionName: '',
        isSession: false,
        ownerId: 1,
        pocIds: [2],
        collaboratorIds: [3],
        startDate: format(subDays(new Date(), 43), 'MM/dd/yyyy'),
        endDate: today,
        eventStatus: TRAINING_REPORT_STATUSES.IN_PROGRESS,
        sessionId: 4,
      },
      // 40 days past session startDate: should send email
      {
        id: 5,
        eventId: 'RO1-012-1238',
        eventName: 'Event 5',
        alertType: 'missingSessionInfo',
        sessionName: '',
        isSession: false,
        ownerId: 1,
        pocIds: [2],
        collaboratorIds: [3],
        startDate: format(subDays(new Date(), 40), 'MM/dd/yyyy'),
        endDate: today,
        eventStatus: TRAINING_REPORT_STATUSES.IN_PROGRESS,
        sessionId: 5,
      },
      // 60 days past session startDate: should send email
      {
        id: 6,
        eventId: 'RO1-012-1239',
        eventName: 'Event 6',
        alertType: 'missingSessionInfo',
        sessionName: '',
        isSession: false,
        ownerId: 1,
        pocIds: [2],
        collaboratorIds: [3],
        startDate: format(subDays(new Date(), 60), 'MM/dd/yyyy'),
        endDate: today,
        eventStatus: TRAINING_REPORT_STATUSES.IN_PROGRESS,
        sessionId: 6,
      },
      // missing start date, no email
      {
        id: 7,
        eventId: 'RO1-012-1240',
        eventName: 'Event 7',
        alertType: 'missingSessionInfo',
        sessionName: '',
        isSession: false,
        ownerId: 1,
        pocIds: [2],
        collaboratorIds: [3],
        startDate: '',
        endDate: '',
        eventStatus: TRAINING_REPORT_STATUSES.IN_PROGRESS,
        sessionId: 7,
      },
    ]);

    userById.mockResolvedValue({ id: 1, email: 'email@email.com' });

    const emails = await trainingReportTaskDueNotifications(EMAIL_DIGEST_FREQ.DAILY);

    expect(emails).toEqual([
      {
        debugMessage: 'MAILER: Notifying email@email.com that they need to complete session info for TR RO1-012-1234',
        displayId: 'RO1-012-1234',
        report: {
          displayId: 'RO1-012-1234',
        },
        emailTo: [
          'email@email.com',
        ],
        prefix: 'Reminder:',
        reportPath: 'http://localhost:3000/training-report/1234/session/1',
        templatePath: 'tr_owner_reminder_session',
      },
      {
        debugMessage: 'MAILER: Notifying email@email.com that they need to complete session info for TR RO1-012-1234',
        displayId: 'RO1-012-1234',
        report: {
          displayId: 'RO1-012-1234',
        },
        emailTo: [
          'email@email.com',
        ],
        prefix: 'Reminder:',
        reportPath: 'http://localhost:3000/training-report/1234/session/1',
        templatePath: 'tr_collaborator_reminder_session',
      },
      {
        debugMessage: 'MAILER: Notifying email@email.com that they need to complete session info for TR RO1-012-1234',
        displayId: 'RO1-012-1234',
        report: {
          displayId: 'RO1-012-1234',
        },
        emailTo: [
          'email@email.com',
        ],
        prefix: 'Reminder:',
        reportPath: 'http://localhost:3000/training-report/1234/session/1',
        templatePath: 'tr_poc_reminder_session',
      },
      {
        debugMessage: 'MAILER: Notifying email@email.com that they need to complete session info for TR RO1-012-1234',
        displayId: 'RO1-012-1234',
        report: {
          displayId: 'RO1-012-1234',
        },
        emailTo: [
          'email@email.com',
        ],
        prefix: 'Reminder:',
        reportPath: 'http://localhost:3000/training-report/1234/session/1',
        templatePath: 'tr_poc_reminder_session',
      },
      {
        debugMessage: 'MAILER: Notifying email@email.com that they need to complete session info for TR RO1-012-1238',
        displayId: 'RO1-012-1238',
        report: {
          displayId: 'RO1-012-1238',
        },
        emailTo: [
          'email@email.com',
        ],
        prefix: 'Past due:',
        reportPath: 'http://localhost:3000/training-report/1238/session/5',
        templatePath: 'tr_owner_reminder_session',
      },
      {
        debugMessage: 'MAILER: Notifying email@email.com that they need to complete session info for TR RO1-012-1238',
        displayId: 'RO1-012-1238',
        report: {
          displayId: 'RO1-012-1238',
        },
        emailTo: [
          'email@email.com',
        ],
        prefix: 'Past due:',
        reportPath: 'http://localhost:3000/training-report/1238/session/5',
        templatePath: 'tr_collaborator_reminder_session',
      },
      {
        debugMessage: 'MAILER: Notifying email@email.com that they need to complete session info for TR RO1-012-1238',
        displayId: 'RO1-012-1238',
        report: {
          displayId: 'RO1-012-1238',
        },
        emailTo: [
          'email@email.com',
        ],
        prefix: 'Past due:',
        reportPath: 'http://localhost:3000/training-report/1238/session/5',
        templatePath: 'tr_poc_reminder_session',
      },
      {
        debugMessage: 'MAILER: Notifying email@email.com that they need to complete session info for TR RO1-012-1239',
        displayId: 'RO1-012-1239',
        report: {
          displayId: 'RO1-012-1239',
        },
        emailTo: [
          'email@email.com',
        ],
        prefix: 'Past due:',
        reportPath: 'http://localhost:3000/training-report/1239/session/6',
        templatePath: 'tr_owner_reminder_session',
      },
      {
        debugMessage: 'MAILER: Notifying email@email.com that they need to complete session info for TR RO1-012-1239',
        displayId: 'RO1-012-1239',
        report: {
          displayId: 'RO1-012-1239',
        },
        emailTo: [
          'email@email.com',
        ],
        prefix: 'Past due:',
        reportPath: 'http://localhost:3000/training-report/1239/session/6',
        templatePath: 'tr_collaborator_reminder_session',
      },
      {
        debugMessage: 'MAILER: Notifying email@email.com that they need to complete session info for TR RO1-012-1239',
        displayId: 'RO1-012-1239',
        report: {
          displayId: 'RO1-012-1239',
        },
        emailTo: [
          'email@email.com',
        ],
        prefix: 'Past due:',
        reportPath: 'http://localhost:3000/training-report/1239/session/6',
        templatePath: 'tr_poc_reminder_session',
      },
    ]);
  });
  it('adds eventNotCompleted jobs to the queue', async () => {
    getTrainingReportAlerts.mockResolvedValue([
      // 20 days past event endDate: should send email
      {
        id: 1,
        eventId: 'RO1-012-1234',
        eventName: 'Event 1',
        alertType: 'eventNotCompleted',
        sessionName: '',
        isSession: false,
        ownerId: 1,
        pocIds: [2],
        collaboratorIds: [3],
        startDate: format(subDays(new Date(), 30), 'MM/dd/yyyy'),
        endDate: format(subDays(new Date(), 20), 'MM/dd/yyyy'),
        eventStatus: TRAINING_REPORT_STATUSES.IN_PROGRESS,
        sessionId: false,
      },
      // end Date is today, no email
      {
        id: 2,
        eventId: 'RO1-012-1235',
        eventName: 'Event 2',
        alertType: 'eventNotCompleted',
        sessionName: '',
        isSession: false,
        ownerId: 1,
        pocIds: [2],
        collaboratorIds: [3],
        startDate: format(subDays(new Date(), 30), 'MM/dd/yyyy'),
        endDate: today,
        eventStatus: TRAINING_REPORT_STATUSES.IN_PROGRESS,
        sessionId: false,
      },
      // 30 days past event endDate: don't send email
      {
        id: 3,
        eventId: 'RO1-012-1236',
        eventName: 'Event 3',
        alertType: 'eventNotCompleted',
        sessionName: '',
        isSession: false,
        ownerId: 1,
        pocIds: [2],
        collaboratorIds: [3],
        startDate: format(subDays(new Date(), 60), 'MM/dd/yyyy'),
        endDate: format(subDays(new Date(), 30), 'MM/dd/yyyy'),
        eventStatus: TRAINING_REPORT_STATUSES.IN_PROGRESS,
        sessionId: false,
      },
      // 43 days past event endDate: don't send email
      {
        id: 4,
        eventId: 'RO1-012-1237',
        eventName: 'Event 4',
        alertType: 'eventNotCompleted',
        sessionName: '',
        isSession: false,
        ownerId: 1,
        pocIds: [2],
        collaboratorIds: [3],
        startDate: format(subDays(new Date(), 43), 'MM/dd/yyyy'),
        endDate: format(subDays(new Date(), 43), 'MM/dd/yyyy'),
        eventStatus: TRAINING_REPORT_STATUSES.IN_PROGRESS,
        sessionId: false,
      },
      // 40 days past event endDatte: should send email
      {
        id: 5,
        eventId: 'RO1-012-1238',
        eventName: 'Event 5',
        alertType: 'eventNotCompleted',
        sessionName: '',
        isSession: false,
        ownerId: 1,
        pocIds: [2],
        collaboratorIds: [3],
        startDate: format(subDays(new Date(), 40), 'MM/dd/yyyy'),
        endDate: format(subDays(new Date(), 40), 'MM/dd/yyyy'),
        eventStatus: TRAINING_REPORT_STATUSES.IN_PROGRESS,
        sessionId: false,
      },
      // 60 days past event endDate: should send email
      {
        id: 6,
        eventId: 'RO1-012-1239',
        eventName: 'Event 6',
        alertType: 'eventNotCompleted',
        sessionName: '',
        isSession: false,
        ownerId: 1,
        pocIds: [2],
        collaboratorIds: [3],
        startDate: format(subDays(new Date(), 60), 'MM/dd/yyyy'),
        endDate: format(subDays(new Date(), 60), 'MM/dd/yyyy'),
        eventStatus: TRAINING_REPORT_STATUSES.IN_PROGRESS,
        sessionId: false,
      },
      // missing endDate date, no email
      {
        id: 7,
        eventId: 'RO1-012-1240',
        eventName: 'Event 7',
        alertType: 'eventNotCompleted',
        sessionName: '',
        isSession: false,
        ownerId: 1,
        pocIds: [2],
        collaboratorIds: [3],
        startDate: today,
        endDate: '',
        eventStatus: TRAINING_REPORT_STATUSES.IN_PROGRESS,
        sessionId: false,
      },
    ]);

    userById.mockResolvedValue({ id: 1, email: 'email@email.com' });

    const emails = await trainingReportTaskDueNotifications(EMAIL_DIGEST_FREQ.DAILY);

    expect(emails).toEqual([
      {
        debugMessage: 'MAILER: Notifying email@email.com that they need to complete event RO1-012-1234',
        displayId: 'RO1-012-1234',
        report: {
          displayId: 'RO1-012-1234',
        },
        emailTo: [
          'email@email.com',
        ],
        prefix: 'Reminder:',
        reportPath: 'http://localhost:3000/training-report/view/1234',
        templatePath: 'tr_owner_reminder_event_not_completed',
      },
      {
        debugMessage: 'MAILER: Notifying email@email.com that they need to complete event RO1-012-1238',
        displayId: 'RO1-012-1238',
        report: {
          displayId: 'RO1-012-1238',
        },
        emailTo: [
          'email@email.com',
        ],
        prefix: 'Past due:',
        reportPath: 'http://localhost:3000/training-report/view/1238',
        templatePath: 'tr_owner_reminder_event_not_completed',
      },
      {
        debugMessage: 'MAILER: Notifying email@email.com that they need to complete event RO1-012-1239',
        report: {
          displayId: 'RO1-012-1239',
        },
        displayId: 'RO1-012-1239',
        emailTo: [
          'email@email.com',
        ],
        prefix: 'Past due:',
        reportPath: 'http://localhost:3000/training-report/view/1239',
        templatePath: 'tr_owner_reminder_event_not_completed',
      },
    ]);
  });

  it('return null if the user is not found', async () => {
    getTrainingReportAlerts.mockResolvedValue([
      // 20 days past event startDate: should send email
      {
        id: 1,
        eventId: 'RO1-012-1234',
        eventName: 'Event 1',
        alertType: 'missingEventInfo',
        sessionName: '',
        isSession: false,
        ownerId: 1,
        pocIds: [2],
        collaboratorIds: [3],
        startDate: format(subDays(new Date(), 20), 'MM/dd/yyyy'),
        endDate: today,
      },
    ]);

    userById.mockResolvedValue(null);

    const emails = await trainingReportTaskDueNotifications(EMAIL_DIGEST_FREQ.DAILY);

    expect(emails).toEqual([null, null]);
    expect(userById).toHaveBeenCalledWith(1, true);
    expect(userById).toHaveBeenCalledWith(3, true);
  });

  it('return null if the user email is not found', async () => {
    getTrainingReportAlerts.mockResolvedValue([
      // 20 days past event startDate: should send email
      {
        id: 1,
        eventId: 'RO1-012-1234',
        eventName: 'Event 1',
        alertType: 'missingEventInfo',
        sessionName: '',
        isSession: false,
        ownerId: 1,
        pocIds: [2],
        collaboratorIds: [3],
        startDate: format(subDays(new Date(), 20), 'MM/dd/yyyy'),
        endDate: today,
      },
    ]);

    userById.mockResolvedValue({ id: 1, email: null });

    const emails = await trainingReportTaskDueNotifications(EMAIL_DIGEST_FREQ.DAILY);

    expect(emails).toEqual([null, null]);
    expect(userById).toHaveBeenCalledWith(1, true);
    expect(userById).toHaveBeenCalledWith(3, true);
  });
});
