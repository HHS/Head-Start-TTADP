import moment from 'moment';
import { trainingReportTaskDueNotifications } from '.';
import newQueue from '../queue';
import { userById } from '../../services/users';
import { getTrainingReportAlerts } from '../../services/event';
import { EMAIL_DIGEST_FREQ } from '../../constants';

jest.mock('../../services/event', () => ({ getTrainingReportAlerts: jest.fn() }));
jest.mock('../../services/users', () => ({ userById: jest.fn() }));
jest.mock('../queue');

/**
 * export type TRAlertShape = {
  id: number;
  eventId: string;
  eventName: string;
  alertType: 'noSessionsCreated' | 'missingEventInfo' | 'missingSessionInfo' | 'eventNotCompleted';
  sessionName: string;
  isSession: boolean;
  ownerId: number;
  pocIds: number[];
  collaboratorIds: number[];
  startDate: string;
  endDate: string;
};
 */
describe('trainingReportTaskDueNotifications', () => {
  it('requires a date', async () => {
    await expect(trainingReportTaskDueNotifications()).rejects.toThrow('date is null');
  });

  it('adds noSessionsCreated jobs to the queue', async () => {
    getTrainingReportAlerts.mockResolvedValue([
      {
        id: 1,
        eventId: '1',
        eventName: 'Event 1',
        alertType: 'noSessionsCreated',
        sessionName: '',
        isSession: false,
        ownerId: 1,
        pocIds: [2],
        collaboratorIds: [3],
        startDate: moment().subtract(1, 'month').format('MM/DD/YYYY'),
        endDate: '01/31/2021',
      },
      {
        id: 2,
        eventId: '2',
        eventName: 'Event 2',
        alertType: 'noSessionsCreated',
        sessionName: '',
        isSession: false,
        ownerId: 1,
        pocIds: [2],
        collaboratorIds: [3],
        startDate: '03/01/2021',
        endDate: '03/31/2021',
      },
    ]);

    userById.mockResolvedValue({ id: 1, email: 'email@email.com' });
    await trainingReportTaskDueNotifications(EMAIL_DIGEST_FREQ.DAILY);

    newQueue.add.mock.calls.forEach((call) => {
      const [job] = call;
      expect(job.data).toEqual({
        alertId: 1,
        email: 'email',
        eventName: 'Event 1',
        alertType: 'noSessionsCreated',
        startDate: '01/01/2021',
        endDate: '01/31/2021',
        isSession: false,
        ownerId: 1,
        pocIds: [2],
        collaboratorIds: [3],
      });
    });

    expect(true).toBe(false);
  });
});
