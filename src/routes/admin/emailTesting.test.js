import { isNonProductionEnvironment } from '../../envParser';
import { handleError } from '../../lib/apiErrorHandler';
import { sendEmailDigests } from '../../lib/cron';
import { notifyRecentMonitoringDeliveries } from '../../services/monitoringDeliveryNotifications';
import { runDigests, runMonitoringDeliveries } from './emailTesting';

jest.mock('../../lib/cron', () => ({
  sendEmailDigests: jest.fn(),
}));

jest.mock('../../services/monitoringDeliveryNotifications', () => ({
  notifyRecentMonitoringDeliveries: jest.fn(),
}));

jest.mock('../../services/currentUser', () => ({
  currentUserId: jest.fn().mockResolvedValue(1),
}));

jest.mock('../../envParser', () => ({
  ...jest.requireActual('../../envParser'),
  isNonProductionEnvironment: jest.fn(),
}));

jest.mock('../../lib/apiErrorHandler', () => ({
  handleError: jest.fn(),
}));

jest.mock('../../logger', () => ({
  auditLogger: { info: jest.fn(), error: jest.fn() },
  logger: { info: jest.fn(), error: jest.fn() },
}));

describe('admin email testing', () => {
  const json = jest.fn();
  const mockResponse = {
    json,
    status: jest.fn(() => mockResponse),
  };
  const mockRequest = (params = {}) => ({ session: { userId: 1 }, params });

  beforeEach(() => {
    jest.clearAllMocks();
    isNonProductionEnvironment.mockReturnValue(true);
  });

  describe('runDigests', () => {
    it('refuses to run in production', async () => {
      isNonProductionEnvironment.mockReturnValue(false);

      await runDigests(mockRequest({ frequency: 'daily' }), mockResponse);

      expect(sendEmailDigests).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    it('runs the daily digests with training report notifications', async () => {
      sendEmailDigests.mockResolvedValue(3);

      await runDigests(mockRequest({ frequency: 'daily' }), mockResponse);

      expect(sendEmailDigests).toHaveBeenCalledWith('DAILY', { includeTrainingReport: true });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(json).toHaveBeenCalledWith({ frequency: 'DAILY', queued: 3 });
    });

    it('runs the weekly and monthly digests without training report notifications', async () => {
      sendEmailDigests.mockResolvedValue(0);

      await runDigests(mockRequest({ frequency: 'weekly' }), mockResponse);
      await runDigests(mockRequest({ frequency: 'monthly' }), mockResponse);

      expect(sendEmailDigests).toHaveBeenCalledWith('WEEKLY', { includeTrainingReport: false });
      expect(sendEmailDigests).toHaveBeenCalledWith('MONTHLY', { includeTrainingReport: false });
    });

    it('rejects an unknown frequency', async () => {
      await runDigests(mockRequest({ frequency: 'hourly' }), mockResponse);

      expect(sendEmailDigests).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('handles errors', async () => {
      const error = new Error('boom');
      sendEmailDigests.mockRejectedValue(error);
      const req = mockRequest({ frequency: 'daily' });

      await runDigests(req, mockResponse);

      expect(handleError).toHaveBeenCalledWith(req, mockResponse, error, {
        namespace: 'ADMIN:EMAIL_TESTING:DIGESTS',
      });
    });
  });

  describe('runMonitoringDeliveries', () => {
    it('refuses to run in production', async () => {
      isNonProductionEnvironment.mockReturnValue(false);

      await runMonitoringDeliveries(mockRequest(), mockResponse);

      expect(notifyRecentMonitoringDeliveries).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    it('sends the notifications and returns the summary', async () => {
      const summary = { detected: 2, recorded: 2, inApp: 5, emails: 1 };
      notifyRecentMonitoringDeliveries.mockResolvedValue(summary);

      await runMonitoringDeliveries(mockRequest(), mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(json).toHaveBeenCalledWith(summary);
    });

    it('handles errors', async () => {
      const error = new Error('boom');
      notifyRecentMonitoringDeliveries.mockRejectedValue(error);
      const req = mockRequest();

      await runMonitoringDeliveries(req, mockResponse);

      expect(handleError).toHaveBeenCalledWith(req, mockResponse, error, {
        namespace: 'ADMIN:EMAIL_TESTING:MONITORING_DELIVERIES',
      });
    });
  });
});
