import {
  getReport,
  saveReport,
  createReport,
  getActivityRecipients,
  getApprovers,
  submitReport,
  reviewReport,
} from './handlers';
import {
  activityReportById, createOrUpdate, possibleRecipients, review,
} from '../../services/activityReports';
import { userById, usersWithPermissions } from '../../services/users';
import ActivityReport from '../../policies/activityReport';
import User from '../../policies/user';

jest.mock('../../services/activityReports', () => ({
  activityReportById: jest.fn(),
  createOrUpdate: jest.fn(),
  possibleRecipients: jest.fn(),
  review: jest.fn(),
}));

jest.mock('../../services/users', () => ({
  userById: jest.fn(),
  usersWithPermissions: jest.fn(),
}));

jest.mock('../../policies/user');
jest.mock('../../policies/activityReport');

const mockResponse = {
  json: jest.fn(),
  sendStatus: jest.fn(),
  status: jest.fn(() => ({
    end: jest.fn(),
  })),
};

const mockRequest = {
  session: {
    userId: 1,
  },
};

const report = {
  id: 1,
  resourcesUsed: 'resources',
  userId: 1,
};

describe('Activity Report handlers', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('reviewReport', () => {
    const request = {
      ...mockRequest,
      params: { activityReportId: 1 },
      body: { status: 'Approved', managerNotes: 'notes' },
    };

    it('returns the new status', async () => {
      ActivityReport.mockImplementationOnce(() => ({
        canReview: () => true,
      }));
      activityReportById.mockResolvedValue({ status: 'Approved' });
      review.mockResolvedValue({ status: 'Approved' });
      userById.mockResolvedValue({
        id: 1,
      });
      await reviewReport(request, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith({ status: 'Approved' });
    });

    it('handles unauthorizedRequests', async () => {
      ActivityReport.mockImplementationOnce(() => ({
        canReview: () => false,
      }));
      activityReportById.mockResolvedValue({ status: 'Approved' });
      await reviewReport(request, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(403);
    });
  });

  describe('submitReport', () => {
    const request = {
      ...mockRequest,
      params: { activityReportId: 1 },
      body: { approvingManagerId: 1, additionalNotes: 'notes' },
    };

    it('returns the report', async () => {
      ActivityReport.mockImplementationOnce(() => ({
        canUpdate: () => true,
      }));
      createOrUpdate.mockResolvedValue(report);
      userById.mockResolvedValue({
        id: 1,
      });
      await submitReport(request, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith(report);
    });

    it('handles unauthorizedRequests', async () => {
      ActivityReport.mockImplementationOnce(() => ({
        canUpdate: () => false,
      }));
      activityReportById.mockResolvedValue(report);
      userById.mockResolvedValue({
        id: 1,
      });
      await submitReport(request, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(403);
    });
  });

  describe('createReport', () => {
    const request = {
      ...mockRequest,
      params: { activityReportId: 1 },
      body: { resourcesUsed: 'test' },
    };

    it('returns the created report', async () => {
      ActivityReport.mockImplementationOnce(() => ({
        canCreate: () => true,
      }));
      createOrUpdate.mockResolvedValue(report);
      userById.mockResolvedValue({
        id: 1,
      });
      await createReport(request, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith(report);
    });

    it('handles empty requests', async () => {
      const { body, ...withoutBody } = request;
      await createReport(withoutBody, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(400);
    });

    it('handles unauthorized requests', async () => {
      ActivityReport.mockImplementationOnce(() => ({
        canCreate: () => false,
      }));
      userById.mockResolvedValue({
        id: 1,
      });
      await createReport(request, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(403);
    });
  });

  describe('saveReport', () => {
    const request = {
      ...mockRequest,
      params: { activityReportId: 1 },
      body: { resourcesUsed: 'test' },
    };

    it('returns the updated report', async () => {
      ActivityReport.mockImplementationOnce(() => ({
        canUpdate: () => true,
      }));
      activityReportById.mockResolvedValue(report);
      createOrUpdate.mockResolvedValue(report);
      userById.mockResolvedValue({
        id: 1,
      });
      await saveReport(request, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith(report);
    });

    it('handles unauthorized requests', async () => {
      activityReportById.mockResolvedValue(report);
      ActivityReport.mockImplementationOnce(() => ({
        canUpdate: () => false,
      }));
      userById.mockResolvedValue({
        id: 1,
      });
      await saveReport(request, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(403);
    });

    it('handles reports that are not found', async () => {
      activityReportById.mockResolvedValue(null);
      await saveReport(request, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(404);
    });

    it('handles empty requests', async () => {
      const { body, ...withoutBody } = request;
      await saveReport(withoutBody, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('getReport', () => {
    const request = {
      ...mockRequest,
      params: { activityReportId: 1 },
    };

    it('returns the report', async () => {
      ActivityReport.mockImplementationOnce(() => ({
        canGet: () => true,
      }));
      activityReportById.mockResolvedValue(report);
      userById.mockResolvedValue({
        id: 1,
      });

      await getReport(request, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith(report);
    });

    it('handles reports that are not found', async () => {
      activityReportById.mockResolvedValue(null);
      await getReport(request, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(404);
    });

    it('handles unauthorized requests', async () => {
      activityReportById.mockResolvedValue(report);
      ActivityReport.mockImplementationOnce(() => ({
        canGet: () => false,
      }));
      await getReport(request, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(403);
    });
  });

  describe('getActivityRecipients', () => {
    it('returns recipients when region query param is passed', async () => {
      const response = [{ test: 'test' }];
      possibleRecipients.mockResolvedValue(response);

      const mockRequestWithRegion = { ...mockRequest, query: { region: 14 } };
      await getActivityRecipients(mockRequestWithRegion, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith(response);
    });

    it('returns recipients when regions query param is not passed', async () => {
      const response = [{ test: 'test' }];
      possibleRecipients.mockResolvedValue(response);

      const mockRequestWithNoRegion = { ...mockRequest, query: {} };
      await getActivityRecipients(mockRequestWithNoRegion, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith(response);
    });
  });

  describe('getApprovers', () => {
    it('returns a list of approvers', async () => {
      User.mockImplementation(() => ({
        canViewUsersInRegion: () => true,
      }));
      const response = [{ name: 'name', id: 1 }];
      usersWithPermissions.mockResolvedValue(response);
      await getApprovers({ ...mockRequest, query: { region: 1 } }, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith(response);
    });

    it('handles unauthorized', async () => {
      User.mockImplementation(() => ({
        canViewUsersInRegion: () => false,
      }));
      const response = [{ name: 'name', id: 1 }];
      usersWithPermissions.mockResolvedValue(response);
      await getApprovers({ ...mockRequest, query: { region: 1 } }, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(403);
    });
  });
});
