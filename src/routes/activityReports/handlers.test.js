import {
  getReport, saveReport, createReport, getActivityRecipients, getApprovers, submitReport,
} from './handlers';
import { activityReportById, createOrUpdate, possibleRecipients } from '../../services/activityReports';
import { userById, usersWithPermissions } from '../../services/users';
import ActivityReport from '../../policies/activityReport';

jest.mock('../../services/activityReports', () => ({
  activityReportById: jest.fn(),
  createOrUpdate: jest.fn(),
  possibleRecipients: jest.fn(),
}));

jest.mock('../../services/users', () => ({
  userById: jest.fn(),
  usersWithPermissions: jest.fn(),
}));

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

  describe('submitReport', () => {
    const request = {
      ...mockRequest,
      params: { activityReportId: 1 },
      body: { approvingManagerId: 1, additionalNotes: 'notes' },
    };

    it('returns the report', async () => {
      ActivityReport.prototype.canUpdate = jest.fn().mockReturnValue(true);
      createOrUpdate.mockResolvedValue(report);
      userById.mockResolvedValue({
        id: 1,
      });
      await submitReport(request, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith(report);
    });

    it('handles unauthorizedRequests', async () => {
      ActivityReport.prototype.canUpdate = jest.fn().mockReturnValue(false);
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
      ActivityReport.prototype.canCreate = jest.fn().mockReturnValue(false);
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
      ActivityReport.prototype.canUpdate = jest.fn().mockReturnValue(false);
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
      ActivityReport.prototype.canGet = jest.fn().mockReturnValue(false);
      await getReport(request, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(403);
    });
  });

  describe('getActivityRecipients', () => {
    it('returns recipients', async () => {
      const response = [{ test: 'test' }];
      possibleRecipients.mockResolvedValue(response);
      await getActivityRecipients(mockRequest, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith(response);
    });
  });

  describe('getApprovers', () => {
    it('returns a list of approvers', async () => {
      const response = [{ name: 'name', id: 1 }];
      usersWithPermissions.mockResolvedValue(response);
      await getApprovers({ ...mockRequest, query: { region: 1 } }, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith(response);
    });
  });
});
