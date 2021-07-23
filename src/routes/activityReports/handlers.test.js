import {
  getReport,
  saveReport,
  createReport,
  getActivityRecipients,
  getApprovers,
  submitReport,
  reviewReport,
  resetToDraft,
  getReports,
  getReportAlerts,
  getLegacyReport,
  downloadReports,
  updateLegacyFields,
  softDeleteReport,
  downloadAllReports,
  downloadAllAlerts,
} from './handlers';
import {
  activityReportById,
  createOrUpdate,
  possibleRecipients,
  review,
  setStatus,
  activityReports,
  activityReportAlerts,
  activityReportByLegacyId,
  getDownloadableActivityReportsByIds,
  getAllDownloadableActivityReports,
  getAllDownloadableActivityReportAlerts,
} from '../../services/activityReports';
import { getUserReadRegions, setReadRegions } from '../../services/accessValidation';
import { userById, usersWithPermissions } from '../../services/users';
import ActivityReport from '../../policies/activityReport';
import handleErrors from '../../lib/apiErrorHandler';
import User from '../../policies/user';
import db, { User as UserModel, Permission } from '../../models';
import * as mailer from '../../lib/mailer';
import { REPORT_STATUSES } from '../../constants';
import SCOPES from '../../middleware/scopeConstants';

jest.mock('../../services/activityReports', () => ({
  activityReportById: jest.fn(),
  createOrUpdate: jest.fn(),
  possibleRecipients: jest.fn(),
  review: jest.fn(),
  setStatus: jest.fn(),
  activityReports: jest.fn(),
  activityReportAlerts: jest.fn(),
  activityReportByLegacyId: jest.fn(),
  getAllDownloadableActivityReportAlerts: jest.fn(),
  getAllDownloadableActivityReports: jest.fn(),
  getDownloadableActivityReportsByIds: jest.fn(),
}));

jest.mock('../../services/accessValidation');

jest.mock('../../services/users', () => ({
  userById: jest.fn(),
  usersWithPermissions: jest.fn(),
}));

jest.mock('../../policies/user');
jest.mock('../../policies/activityReport');
jest.mock('../../lib/apiErrorHandler');

const mockResponse = {
  attachment: jest.fn(),
  json: jest.fn(),
  send: jest.fn(),
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
const mockManager = {
  id: 1843,
  hsesUserId: '1843',
  hsesUsername: 'user1843',
  homeRegionId: 1,
  email: 'mockManager1843@test.gov',
};
const mockUser = {
  id: 1844,
  hsesUserId: '1844',
  hsesUsername: 'user1844',
  homeRegionId: 1,
  email: 'mockManager1844@test.gov',
};

const report = {
  id: 1,
  resourcesUsed: 'resources',
  userId: mockUser.id,
  approvingManager: mockManager,
  displayId: 'mockreport-1',
  regionId: 1,
};

describe('Activity Report handlers', () => {
  beforeAll(async () => {
    await UserModel.create(mockManager);
    await UserModel.create(mockUser);
    await Permission.create({
      userId: mockUser.id,
      regionId: 1,
      scopeId: SCOPES.READ_WRITE_REPORTS,
    });
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
  afterAll(async () => {
    await Permission.destroy({ where: { regionId: 1, scopeId: SCOPES.READ_WRITE_REPORTS } });
    await UserModel.destroy({ where: { id: [mockUser.id, mockManager.id] } });
    await db.sequelize.close();
  });

  describe('getLegacyReport', () => {
    const request = {
      ...mockRequest,
      params: { legacyReportId: 1 },
    };

    it('returns a report', async () => {
      ActivityReport.mockImplementationOnce(() => ({
        canViewLegacy: () => true,
      }));
      activityReportByLegacyId.mockResolvedValue({ id: 1 });
      await getLegacyReport(request, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith({ id: 1 });
    });

    it('handles report not being found', async () => {
      activityReportByLegacyId.mockResolvedValue(null);
      await getLegacyReport(request, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(404);
    });

    it('handles unauthorized', async () => {
      ActivityReport.mockImplementationOnce(() => ({
        canViewLegacy: () => false,
      }));
      activityReportByLegacyId.mockResolvedValue({ region: 1 });
      await getLegacyReport(request, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(403);
    });
  });

  describe('updateLegacyFields', () => {
    const comments = 'smartsheet.user@tta.com: My comment';
    const request = {
      ...mockRequest,
      params: { legacyReportId: 1 },
      body: { comments },
    };

    it('updates the import data with the comments', async () => {
      activityReportByLegacyId.mockResolvedValue(report);
      createOrUpdate.mockResolvedValue(report);
      await updateLegacyFields(request, mockResponse);
      expect(createOrUpdate).toHaveBeenCalledWith({ imported: { comments } }, report);
      expect(mockResponse.json).toHaveBeenCalledWith(report);
    });

    it('handles a report not being found', async () => {
      activityReportByLegacyId.mockResolvedValue(null);
      await updateLegacyFields(request, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(404);
    });
  });

  describe('reviewReport', () => {
    const request = {
      ...mockRequest,
      params: { activityReportId: 1 },
      body: { status: REPORT_STATUSES.APPROVED, managerNotes: 'notes' },
    };

    it('returns the new approved status', async () => {
      const mockReportApproved = jest.spyOn(mailer, 'reportApprovedNotification').mockImplementation();
      ActivityReport.mockImplementationOnce(() => ({
        canReview: () => true,
      }));
      activityReportById.mockResolvedValue({ status: REPORT_STATUSES.APPROVED });
      const mockReviewResponse = {
        author: mockUser,
        approvingManager: mockManager,
        displayId: report.displayId,
        status: REPORT_STATUSES.APPROVED,
      };
      review.mockResolvedValue(mockReviewResponse);
      userById.mockResolvedValue({
        id: mockUser.id,
      });
      await reviewReport(request, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith(mockReviewResponse);
      expect(mockReportApproved).toHaveBeenCalled();
    });

    it('returns the new needs action status', async () => {
      const mockReviewResponse = {
        author: mockUser,
        approvingManager: mockManager,
        displayId: report.displayId,
        status: REPORT_STATUSES.APPROVED,
      };
      const request1 = {
        ...mockRequest,
        params: { activityReportId: 1 },
        body: { status: REPORT_STATUSES.NEEDS_ACTION, managerNotes: 'notes' },
      };
      const mockNeedsAction = jest.spyOn(mailer, 'changesRequestedNotification').mockImplementation(() => jest.fn());
      ActivityReport.mockImplementationOnce(() => ({
        canReview: () => true,
      }));
      activityReportById.mockResolvedValue({ status: REPORT_STATUSES.NEEDS_ACTION });
      review.mockResolvedValue(mockReviewResponse);
      userById.mockResolvedValue({
        id: mockUser.id,
      });
      await reviewReport(request1, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith(mockReviewResponse);
      expect(mockNeedsAction).toHaveBeenCalled();
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
    beforeAll(async () => {
    });
    const request = {
      ...mockRequest,
      params: { activityReportId: 1 },
      body: { approvingManagerId: mockManager.id, additionalNotes: 'notes' },
    };

    it('returns the report', async () => {
      ActivityReport.mockImplementationOnce(() => ({
        canUpdate: () => true,
      }));
      createOrUpdate.mockResolvedValue(report);
      userById.mockResolvedValue({
        id: mockUser.id,
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
        id: mockUser.id,
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
        id: mockUser.id,
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
        id: mockUser.id,
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
        id: mockUser.id,
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
        id: mockUser.id,
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
        id: mockUser.id,
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

  describe('resetToDraft', () => {
    const request = {
      ...mockRequest,
      params: { activityReportId: 1 },
    };

    it('returns the updated report', async () => {
      const result = { status: 'draft' };
      ActivityReport.mockImplementation(() => ({
        canReset: () => true,
      }));
      setStatus.mockResolvedValue(result);
      await resetToDraft(request, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith(result);
    });

    it('handles unauthorized', async () => {
      ActivityReport.mockImplementation(() => ({
        canReset: () => false,
      }));
      await resetToDraft(request, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(403);
    });
  });

  describe('softDeleteReport', () => {
    const request = {
      ...mockRequest,
      params: { activityReportId: 1 },
    };

    it('returns 204', async () => {
      ActivityReport.mockImplementation(() => ({
        canDelete: () => true,
      }));
      await softDeleteReport(request, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(204);
    });

    it('handles unauthorized', async () => {
      ActivityReport.mockImplementation(() => ({
        canDelete: () => false,
      }));
      await softDeleteReport(request, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(403);
    });
  });

  describe('getReports', () => {
    const request = {
      ...mockRequest,
      query: { },
    };

    it('returns the reports', async () => {
      activityReports.mockResolvedValue({ count: 1, rows: [report] });
      getUserReadRegions.mockResolvedValue([1]);

      await getReports(request, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith({ count: 1, rows: [report] });
    });

    it('handles a list of reports that are not found', async () => {
      activityReports.mockResolvedValue(null);
      getUserReadRegions.mockResolvedValue([1]);

      await getReports(request, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(404);
    });
  });

  describe('getReportAlerts', () => {
    const request = {
      ...mockRequest,
      query: { },
    };

    it('returns my alerts', async () => {
      activityReportAlerts.mockResolvedValue({ count: 1, rows: [report] });
      await getReportAlerts(request, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith({ alertsCount: 1, alerts: [report] });
    });

    it('handles a list of alerts that are not found', async () => {
      activityReportAlerts.mockResolvedValue(null);
      await getReportAlerts(request, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(404);
    });
  });

  describe('downloadAllReports', () => {
    const request = {
      session: {
        userId: mockUser.id,
      },
      query: { 'region.in': '1' },
    };

    it('returns a csv', async () => {
      getAllDownloadableActivityReports.mockResolvedValue({ count: 1, rows: [report] });
      setReadRegions.mockResolvedValue([1]);
      userById.mockResolvedValue({ permissions: [{ scopeId: 50 }] });
      await downloadAllReports(request, mockResponse);
      expect(mockResponse.attachment).toHaveBeenCalledWith('activity-reports.csv');
    });

    it('handles a list of reports that are not found', async () => {
      getAllDownloadableActivityReports.mockResolvedValue(null);
      getUserReadRegions.mockResolvedValue([1]);

      await downloadAllReports(request, mockResponse);
      expect(mockResponse.attachment).toHaveBeenCalledWith('activity-reports.csv');
    });
  });

  describe('downloadAllAlerts', () => {
    const request = {
      ...mockRequest,
      query: { },
    };

    it('returns a csv', async () => {
      getAllDownloadableActivityReportAlerts.mockResolvedValue({ count: 1, rows: [report] });
      getUserReadRegions.mockResolvedValue([1]);
      userById.mockResolvedValue({ permissions: [{ scopeId: 50 }] });

      await downloadAllAlerts(request, mockResponse);
      expect(mockResponse.attachment).toHaveBeenCalledWith('activity-reports.csv');
    });

    it('handles a list of reports that are not found', async () => {
      getAllDownloadableActivityReportAlerts.mockResolvedValue(null);
      getUserReadRegions.mockResolvedValue([1]);

      await downloadAllAlerts(request, mockResponse);
      expect(mockResponse.attachment).toHaveBeenCalledWith('activity-reports.csv');
    });
  });

  describe('downloadReports', () => {
    it('returns a csv with appropriate headers when format=csv', async () => {
      const request = {
        ...mockRequest,
        query: { format: 'csv' },
      };

      const downloadableReport = {
        id: 616,
        author: {
          name: 'Arty',
        },
      };

      userById.mockResolvedValue({ permissions: [{ scopeId: 50 }] });
      getDownloadableActivityReportsByIds.mockResolvedValue({
        count: 1, rows: [downloadableReport],
      });
      await downloadReports(request, mockResponse);
      expect(mockResponse.attachment).toHaveBeenCalled();

      expect(mockResponse.send).toHaveBeenCalled();
      const [[value]] = mockResponse.send.mock.calls;
      /* eslint-disable no-useless-escape */
      expect(value).toContain('\"Creator\"');
      expect(value).toContain('\"Arty\"');
      /* eslint-enable no-useless-escape */
    });

    it('returns a 404 if we cannot get any reports', async () => {
      const request = {
        ...mockRequest,
        query: { format: 'csv' },
      };

      getDownloadableActivityReportsByIds.mockResolvedValue(null);
      await downloadReports(request, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(404);
    });

    it('returns json when no format is specified', async () => {
      const request = {
        ...mockRequest,
      };

      const downloadableReport = {
        id: 616,
        author: {
          name: 'Arty',
        },
      };

      getDownloadableActivityReportsByIds.mockResolvedValue({
        count: 1, rows: [downloadableReport],
      });
      await downloadReports(request, mockResponse);
      expect(mockResponse.attachment).not.toHaveBeenCalled();

      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('handles thrown errors', async () => {
      const request = {
        ...mockRequest,
      };

      getDownloadableActivityReportsByIds.mockRejectedValueOnce(new Error('Something went wrong!'));

      await downloadReports(request, mockResponse);
      expect(handleErrors).toHaveBeenCalled();
    });

    it('returns an empty value when no ids match and format=csv', async () => {
      const request = {
        ...mockRequest,
        query: { report: [], format: 'csv' },
      };

      getDownloadableActivityReportsByIds.mockResolvedValue({ count: 0, rows: [] });
      await downloadReports(request, mockResponse);
      expect(mockResponse.attachment).toHaveBeenCalled();
      expect(mockResponse.send).toHaveBeenCalled();

      const [[value]] = mockResponse.send.mock.calls;
      expect(value).toEqual('');
    });
  });
});
