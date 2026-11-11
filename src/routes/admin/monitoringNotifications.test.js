import { handleError } from '../../lib/apiErrorHandler';
import { currentUserId } from '../../services/currentUser';
import {
  sendTestMonitoringNotifications,
  TestNotificationRequestError,
} from '../../tools/sendTestMonitoringNotifications';
import { sendTestMonitoringEmails } from './monitoringNotifications';

jest.mock('../../tools/sendTestMonitoringNotifications', () => ({
  ...jest.requireActual('../../tools/sendTestMonitoringNotifications'),
  sendTestMonitoringNotifications: jest.fn(),
}));

jest.mock('../../services/currentUser', () => ({
  currentUserId: jest.fn(),
}));

jest.mock('../../lib/apiErrorHandler', () => ({
  handleError: jest.fn(),
}));

jest.mock('../../logger', () => ({
  auditLogger: { info: jest.fn(), error: jest.fn() },
  logger: { info: jest.fn(), error: jest.fn() },
}));

describe('admin monitoring notification test emails', () => {
  const json = jest.fn();
  const mockResponse = {
    json,
    status: jest.fn(() => mockResponse),
  };
  const mockRequest = (body) => ({ session: { userId: 1 }, body });
  const results = [{ kind: 'digest', userId: 1, email: 'a@test.gov', sent: true, detail: 'x' }];

  beforeEach(() => {
    jest.clearAllMocks();
    currentUserId.mockResolvedValue(1);
    sendTestMonitoringNotifications.mockResolvedValue(results);
  });

  it('emails the requesting admin by default', async () => {
    await sendTestMonitoringEmails(mockRequest({}), mockResponse);

    expect(sendTestMonitoringNotifications).toHaveBeenCalledWith({
      userIds: [1],
      type: 'both',
      freq: 'DAILY',
      deliveredReviewId: undefined,
    });
    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({ results });
  });

  it('passes the chosen users, email type, frequency and review through', async () => {
    await sendTestMonitoringEmails(
      mockRequest({ userIds: [5, 6], type: 'digest', frequency: 'WEEKLY', deliveredReviewId: 9 }),
      mockResponse
    );

    expect(sendTestMonitoringNotifications).toHaveBeenCalledWith({
      userIds: [5, 6],
      type: 'digest',
      freq: 'WEEKLY',
      deliveredReviewId: 9,
    });
  });

  it.each([
    ['userIds that are not ids', { userIds: ['1; drop table'] }],
    ['userIds that are not a list', { userIds: 5 }],
    ['an unknown type', { type: 'sms' }],
    ['an unknown frequency', { frequency: 'HOURLY' }],
    ['a bad review id', { deliveredReviewId: -1 }],
  ])('rejects %s', async (_label, body) => {
    await sendTestMonitoringEmails(mockRequest(body), mockResponse);

    expect(sendTestMonitoringNotifications).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(400);
  });

  it('returns the refusal in production as a 403', async () => {
    sendTestMonitoringNotifications.mockRejectedValue(
      new TestNotificationRequestError('Refusing to send test monitoring notifications', 403)
    );

    await sendTestMonitoringEmails(mockRequest({}), mockResponse);

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({ error: 'Refusing to send test monitoring notifications' });
    expect(handleError).not.toHaveBeenCalled();
  });

  it('returns bad input reported by the tool as a 400', async () => {
    sendTestMonitoringNotifications.mockRejectedValue(
      new TestNotificationRequestError('Users not found: 8')
    );

    await sendTestMonitoringEmails(mockRequest({ userIds: [8] }), mockResponse);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ error: 'Users not found: 8' });
  });

  it('handles unexpected errors', async () => {
    const error = new Error('boom');
    sendTestMonitoringNotifications.mockRejectedValue(error);
    const req = mockRequest({});

    await sendTestMonitoringEmails(req, mockResponse);

    expect(handleError).toHaveBeenCalledWith(req, mockResponse, error, {
      namespace: 'ADMIN:MONITORING_NOTIFICATIONS:TEST',
    });
  });
});
