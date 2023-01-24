import {
  deleteOnlyFile,
  linkHandler,
} from './handlers';
import { userById } from '../../services/users';
import { currentUserId } from '../../services/currentUser';
import {
  getFileById,
  deleteFile,
  createActivityReportFileMetaData,
  createActivityReportObjectiveFileMetaData,
  createObjectiveFileMetaData,
  createObjectiveTemplateFileMetaData,
} from '../../services/files';
import { activityReportAndRecipientsById } from '../../services/activityReports';
import { deleteFileFromS3 } from '../../lib/s3';
import SCOPES from '../../middleware/scopeConstants';
import { REPORT_STATUSES } from '../../constants';

jest.mock('../../services/files', () => ({
  getFileById: jest.fn(),
  deleteFile: jest.fn(),
  createActivityReportFileMetaData: jest.fn(),
  createActivityReportObjectiveFileMetaData: jest.fn(),
  createObjectiveFileMetaData: jest.fn(),
  createObjectiveTemplateFileMetaData: jest.fn(),
  createObjectivesFileMetaData: jest.fn(),
}));

jest.mock('../../services/activityReports', () => ({
  activityReportAndRecipientsById: jest.fn(),
}));

jest.mock('../../services/currentUser', () => ({
  currentUserId: jest.fn(),
}));

jest.mock('../../services/users', () => ({
  userById: jest.fn(),
}));

jest.mock('../../lib/s3', () => ({
  deleteFileFromS3: jest.fn(),
}));

describe('file handlers, additional tests', () => {
  const mockResponse = {
    attachment: jest.fn(),
    json: jest.fn(),
    send: jest.fn(),
    sendStatus: jest.fn(),
    status: jest.fn(() => ({
      end: jest.fn(),
      send: jest.fn(),
    })),
  };

  describe('deleteOnlyFile', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should deny based on permissions', async () => {
      const mockRequest = {
        params: {
          fileId: '123',
        },
        user: {
          id: '456',
        },
      };

      currentUserId.mockResolvedValueOnce(456);
      userById.mockResolvedValueOnce({
        id: 456,
        permissions: [],
      });

      await deleteOnlyFile(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('returns 404 if file not found', async () => {
      const mockRequest = {
        params: {
          fileId: '123',
        },
        user: {
          id: '456',
        },
      };

      currentUserId.mockResolvedValueOnce(456);
      userById.mockResolvedValueOnce({
        id: 456,
        permissions: [
          {
            scopeId: SCOPES.READ_WRITE_REPORTS,
            regionId: 1,
          },
        ],
      });

      getFileById.mockResolvedValueOnce(null);

      await deleteOnlyFile(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('deletes file if there are no associations', async () => {
      const mockRequest = {
        params: {
          fileId: '123',
        },
        user: {
          id: '456',
        },
      };

      currentUserId.mockResolvedValueOnce(456);
      userById.mockResolvedValueOnce({
        id: 456,
        permissions: [
          {
            scopeId: SCOPES.READ_WRITE_REPORTS,
            regionId: 1,
          },
        ],
      });

      getFileById.mockResolvedValueOnce({
        id: 123,
        key: 'key',
        reports: [],
        reportObjectiveFiles: [],
        objectiveFiles: [],
        objectiveTemplateFiles: [],
      });

      await deleteOnlyFile(mockRequest, mockResponse);

      expect(deleteFile).toHaveBeenCalled();
      expect(deleteFileFromS3).toHaveBeenCalled();

      expect(mockResponse.status).toHaveBeenCalledWith(204);
    });

    it('does not delete file if there are associations', async () => {
      const mockRequest = {
        params: {
          fileId: '123',
        },
        user: {
          id: '456',
        },
      };

      currentUserId.mockResolvedValueOnce(456);
      userById.mockResolvedValueOnce({
        id: 456,
        permissions: [
          {
            scopeId: SCOPES.READ_WRITE_REPORTS,
            regionId: 1,
          },
        ],
      });

      getFileById.mockResolvedValueOnce({
        id: 123,
        key: 'key',
        reports: [{}],
        reportObjectiveFiles: [{}],
        objectiveFiles: [],
        objectiveTemplateFiles: [],
      });

      await deleteOnlyFile(mockRequest, mockResponse);

      expect(deleteFile).not.toHaveBeenCalled();
      expect(deleteFileFromS3).not.toHaveBeenCalled();

      expect(mockResponse.status).toHaveBeenCalledWith(204);
    });

    it('handles errors', async () => {
      const mockRequest = {
        params: {
          fileId: '123',
        },
        user: {
          id: '456',
        },
      };

      currentUserId.mockResolvedValueOnce(456);
      userById.mockResolvedValueOnce({
        id: 456,
        permissions: [
          {
            scopeId: SCOPES.READ_WRITE_REPORTS,
            regionId: 1,
          },
        ],
      });

      getFileById.mockResolvedValueOnce({
        id: 123,
        key: 'key',
        reports: [],
        reportObjectiveFiles: [],
        objectiveFiles: [],
        objectiveTemplateFiles: [],
      });

      deleteFile.mockRejectedValueOnce(new Error('error'));

      await deleteOnlyFile(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('linkHandler', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should deny based on permissions', async () => {
      const mockRequest = {
        params: {
          fileId: '123',
          reportId: '456',
        },
      };

      currentUserId.mockResolvedValueOnce(456);
      userById.mockResolvedValueOnce({
        id: 456,
        permissions: [{
          scopeId: SCOPES.READ_WRITE_REPORTS,
          regionId: 1,
        }],
      });
      activityReportAndRecipientsById.mockResolvedValueOnce([
        {
          regionId: 1,
          userId: 234,
          calculatedStatus: REPORT_STATUSES.DRAFT,
          activityReportCollaborators: [],
          approvers: [],
        },
      ]);

      await linkHandler(mockRequest, mockResponse);

      expect(mockResponse.sendStatus).toHaveBeenCalledWith(403);
    });

    it('calls createActivityReportFileMetaData', async () => {
      const mockRequest = {
        params: {
          fileId: 123,
          reportId: 456,
        },
      };

      currentUserId.mockResolvedValueOnce(456);
      userById.mockResolvedValueOnce({
        id: 456,
        permissions: [{
          scopeId: SCOPES.READ_WRITE_REPORTS,
          regionId: 1,
        }],
      });
      activityReportAndRecipientsById.mockResolvedValueOnce([
        {
          regionId: 1,
          userId: 456,
          submissionStatus: REPORT_STATUSES.DRAFT,
          activityReportCollaborators: [],
          approvers: [],
          reportId: 456,
        },
      ]);

      getFileById.mockResolvedValueOnce({
        reportFiles: [],
        originalFileName: 'test.pdf',
        size: 100,
      });

      await linkHandler(mockRequest, mockResponse);

      expect(createActivityReportFileMetaData).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(204);
    });

    it('doesnt createActivityReportFileMetaData if it already exists', async () => {
      const mockRequest = {
        params: {
          fileId: 123,
          reportId: 456,
        },
      };

      currentUserId.mockResolvedValueOnce(456);
      userById.mockResolvedValueOnce({
        id: 456,
        permissions: [{
          scopeId: SCOPES.READ_WRITE_REPORTS,
          regionId: 1,
        }],
      });
      activityReportAndRecipientsById.mockResolvedValueOnce([
        {
          regionId: 1,
          userId: 456,
          submissionStatus: REPORT_STATUSES.DRAFT,
          activityReportCollaborators: [],
          approvers: [],
          reportId: 456,
        },
      ]);

      getFileById.mockResolvedValueOnce({
        reportFiles: [{ activityReportId: 456 }],
        originalFileName: 'test.pdf',
        size: 100,
        reportObjectiveFiles: [],
        objectiveFiles: [],
        objectiveTemplateFiles: [],
      });

      await linkHandler(mockRequest, mockResponse);

      expect(createActivityReportFileMetaData).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(204);
    });
    it('calls createActivityReportObjectiveFileMetaData', async () => {
      const mockRequest = {
        params: {
          fileId: 123,
          objectiveId: 456,
          reportId: 456,
          reportObjectiveId: 1,
        },
      };

      currentUserId.mockResolvedValueOnce(456);
      userById.mockResolvedValueOnce({
        id: 456,
        permissions: [{
          scopeId: SCOPES.READ_WRITE_REPORTS,
          regionId: 1,
        }],
      });

      activityReportAndRecipientsById.mockResolvedValueOnce([
        {
          regionId: 1,
          userId: 456,
          submissionStatus: REPORT_STATUSES.DRAFT,
          activityReportCollaborators: [],
          approvers: [],
          reportId: 456,
        },
      ]);

      getFileById.mockResolvedValueOnce({
        reportFiles: [{ activityReportId: 456 }],
        reportObjectiveFiles: [],
        objectiveFiles: [],
        objectiveTemplateFiles: [],
        originalFileName: 'test.pdf',
        size: 100,
      });

      await linkHandler(mockRequest, mockResponse);

      expect(createActivityReportObjectiveFileMetaData).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(204);
    });

    it('doesn\'t call createActivityReportObjectiveFileMetaData if it already exists', async () => {
      const mockRequest = {
        params: {
          fileId: 123,
          objectiveId: 456,
          reportId: 456,
          reportObjectiveId: 1,
        },
      };

      currentUserId.mockResolvedValueOnce(456);
      userById.mockResolvedValueOnce({
        id: 456,
        permissions: [{
          scopeId: SCOPES.READ_WRITE_REPORTS,
          regionId: 1,
        }],
      });

      activityReportAndRecipientsById.mockResolvedValueOnce([
        {
          regionId: 1,
          userId: 456,
          submissionStatus: REPORT_STATUSES.DRAFT,
          activityReportCollaborators: [],
          approvers: [],
          reportId: 456,
        },
      ]);

      getFileById.mockResolvedValueOnce({
        reportFiles: [{ activityReportId: 456 }],
        reportObjectiveFiles: [{ reportObjectiveId: 1 }],
        objectiveFiles: [],
        objectiveTemplateFiles: [],
        originalFileName: 'test.pdf',
        size: 100,
      });

      await linkHandler(mockRequest, mockResponse);

      expect(createActivityReportObjectiveFileMetaData).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(204);
    });

    it('calls createObjectiveFileMetaData', async () => {
      const mockRequest = {
        params: {
          fileId: 123,
          objectiveId: 456,
          reportObjectiveId: 1,
        },
      };

      currentUserId.mockResolvedValueOnce(456);
      userById.mockResolvedValueOnce({
        id: 456,
        permissions: [{
          scopeId: SCOPES.READ_WRITE_REPORTS,
          regionId: 1,
        }],
      });

      activityReportAndRecipientsById.mockResolvedValueOnce([
        {
          regionId: 1,
          userId: 456,
          submissionStatus: REPORT_STATUSES.DRAFT,
          activityReportCollaborators: [],
          approvers: [],
          reportId: 456,
        },
      ]);

      getFileById.mockResolvedValueOnce({
        reportFiles: [{ activityReportId: 456 }],
        reportObjectiveFiles: [{ reportObjectiveId: 1 }],
        objectiveFiles: [],
        originalFileName: 'test.pdf',
        size: 100,
      });

      await linkHandler(mockRequest, mockResponse);

      expect(createObjectiveFileMetaData).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(204);
    });

    it('doesn\'t call createObjectiveFileMetaData if it already exists', async () => {
      const mockRequest = {
        params: {
          fileId: 123,
          objectiveId: 456,
        },
      };

      currentUserId.mockResolvedValueOnce(456);
      userById.mockResolvedValueOnce({
        id: 456,
        permissions: [{
          scopeId: SCOPES.READ_WRITE_REPORTS,
          regionId: 1,
        }],
      });

      activityReportAndRecipientsById.mockResolvedValueOnce([
        {
          regionId: 1,
          userId: 456,
          submissionStatus: REPORT_STATUSES.DRAFT,
          activityReportCollaborators: [],
          approvers: [],
          reportId: 456,
        },
      ]);

      getFileById.mockResolvedValueOnce({
        reportFiles: [{ activityReportId: 456 }],
        reportObjectiveFiles: [{ reportObjectiveId: 1 }],
        objectiveFiles: [{ objectiveId: 456 }],
        originalFileName: 'test.pdf',
        size: 100,
      });

      await linkHandler(mockRequest, mockResponse);

      expect(createObjectiveFileMetaData).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(204);
    });
    it('calls createObjectiveTemplateFileMetaData', async () => {
      const mockRequest = {
        params: {
          fileId: 123,
          objectiveId: 456,
          objectiveTemplateId: 1,
        },
      };

      currentUserId.mockResolvedValueOnce(456);
      userById.mockResolvedValueOnce({
        id: 456,
        permissions: [{
          scopeId: SCOPES.READ_WRITE_REPORTS,
          regionId: 1,
        }],
      });

      activityReportAndRecipientsById.mockResolvedValueOnce([
        {
          regionId: 1,
          userId: 456,
          submissionStatus: REPORT_STATUSES.DRAFT,
          activityReportCollaborators: [],
          approvers: [],
          reportId: 456,
        },
      ]);

      getFileById.mockResolvedValueOnce({
        reportFiles: [{ activityReportId: 456 }],
        reportObjectiveFiles: [{ reportObjectiveId: 1 }],
        objectiveFiles: [{ objectiveId: 456 }],
        objectiveTemplateFiles: [],
        originalFileName: 'test.pdf',
        size: 100,
      });

      await linkHandler(mockRequest, mockResponse);

      expect(createObjectiveTemplateFileMetaData).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(204);
    });

    it('doesn\'t call createObjectiveTemplateFileMetaData if it already exists', async () => {
      const mockRequest = {
        params: {
          fileId: 123,
          objectiveId: 456,
          objectiveTemplateId: 1,
        },
      };

      currentUserId.mockResolvedValueOnce(456);
      userById.mockResolvedValueOnce({
        id: 456,
        permissions: [{
          scopeId: SCOPES.READ_WRITE_REPORTS,
          regionId: 1,
        }],
      });

      activityReportAndRecipientsById.mockResolvedValueOnce([
        {
          regionId: 1,
          userId: 456,
          submissionStatus: REPORT_STATUSES.DRAFT,
          activityReportCollaborators: [],
          approvers: [],
          reportId: 456,
        },
      ]);

      getFileById.mockResolvedValueOnce({
        reportFiles: [{ activityReportId: 456 }],
        reportObjectiveFiles: [{ reportObjectiveId: 1 }],
        objectiveFiles: [{ objectiveId: 456 }],
        objectiveTemplateFiles: [{ objectiveTemplateId: 1 }],
        originalFileName: 'test.pdf',
        size: 100,
      });

      await linkHandler(mockRequest, mockResponse);

      expect(createObjectiveTemplateFileMetaData).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(204);
    });
  });
});
