import { isNonProductionEnvironment } from '../../envParser';
import { handleError } from '../../lib/apiErrorHandler';
import { sendEmailDigests } from '../../lib/cron';
import {
  notifyRecentMonitoringDeliveries,
  simulateMonitoringReview,
} from '../../services/monitoringDeliveryNotifications';
import router, {
  runDigests,
  runMonitoringDeliveries,
  simulateMonitoringReviewHandler,
} from './emailTesting';

jest.mock('../../lib/cron', () => ({
  sendEmailDigests: jest.fn(),
}));

jest.mock('../../services/monitoringDeliveryNotifications', () => ({
  notifyRecentMonitoringDeliveries: jest.fn(),
  simulateMonitoringReview: jest.fn(),
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

  it('runs every endpoint outside a request transaction', () => {
    const handlers = router.stack.map(({ route }) => route.stack.map(({ handle }) => handle));
    expect(handlers).toEqual([
      [runDigests],
      [runMonitoringDeliveries],
      [simulateMonitoringReviewHandler],
    ]);
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

      expect(mockResponse.status).not.toHaveBeenCalledWith(200);
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

  describe('simulateMonitoringReviewHandler', () => {
    it('refuses to run in production', async () => {
      isNonProductionEnvironment.mockReturnValue(false);

      await simulateMonitoringReviewHandler(mockRequest({ regionId: '1' }), mockResponse);

      expect(simulateMonitoringReview).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    it('rejects an invalid region', async () => {
      await simulateMonitoringReviewHandler(mockRequest({ regionId: '1 OR 1=1' }), mockResponse);
      await simulateMonitoringReviewHandler(mockRequest({ regionId: '0' }), mockResponse);

      expect(simulateMonitoringReview).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledTimes(2);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('simulates a review in the region and returns the result', async () => {
      const result = {
        mrid: -1,
        recipientName: 'Recipient A',
        regionId: 3,
        detected: 1,
        recorded: 1,
        inApp: 4,
        emails: 2,
      };
      simulateMonitoringReview.mockResolvedValue(result);

      await simulateMonitoringReviewHandler(mockRequest({ regionId: '3' }), mockResponse);

      expect(simulateMonitoringReview).toHaveBeenCalledWith(3);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(json).toHaveBeenCalledWith(result);
    });

    it('returns 404 when the region has no active grant', async () => {
      simulateMonitoringReview.mockResolvedValue(null);

      await simulateMonitoringReviewHandler(mockRequest({ regionId: '3' }), mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('handles errors', async () => {
      const error = new Error('boom');
      simulateMonitoringReview.mockRejectedValue(error);
      const req = mockRequest({ regionId: '3' });

      await simulateMonitoringReviewHandler(req, mockResponse);

      expect(handleError).toHaveBeenCalledWith(req, mockResponse, error, {
        namespace: 'ADMIN:EMAIL_TESTING:SIMULATE_MONITORING_REVIEW',
      });
    });
  });
});
