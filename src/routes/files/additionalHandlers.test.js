import db from '../../models';
import {
  deleteOnlyFile,
  deleteHandler,
} from './handlers';
import { userById } from '../../services/users';
import { currentUserId } from '../../services/currentUser';
import {
  getFileById,
  deleteFile,
  deleteCommunicationLogFile,
  deleteSessionSupportingAttachment,
} from '../../services/files';
import { logById } from '../../services/communicationLog';
import { deleteFileFromS3 } from '../../lib/s3';
import SCOPES from '../../middleware/scopeConstants';
import { findSessionById } from '../../services/sessionReports';
import { findEventBySmartsheetIdSuffix } from '../../services/event';

jest.mock('../../services/communicationLog', () => ({
  logById: jest.fn(),
}));

jest.mock('../../services/sessionReports', () => ({
  findSessionById: jest.fn(),
}));

jest.mock('../../services/event', () => ({
  findEventBySmartsheetIdSuffix: jest.fn(),
}));

jest.mock('../../services/files', () => ({
  getFileById: jest.fn(),
  deleteFile: jest.fn(),
  createActivityReportFileMetaData: jest.fn(),
  createActivityReportObjectiveFileMetaData: jest.fn(),
  deleteObjectiveFile: jest.fn(),
  deleteCommunicationLogFile: jest.fn(),
  deleteSessionSupportingAttachment: jest.fn(),
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

jest.mock('../../services/objectives', () => ({
  getObjectiveById: jest.fn(),
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

  describe('deleteHandler', () => {
    afterEach(async () => {
      jest.clearAllMocks();

      await db.sequelize.close();
    });

    it('deletes a communication log file', async () => {
      const mockRequest = {
        params: {
          fileId: '123',
          communicationLogId: '456',
        },
        user: {
          id: 1,
        },
      };

      currentUserId.mockResolvedValue(1);
      userById.mockResolvedValue({
        id: 1,
        permissions: [{
          scopeId: SCOPES.READ_WRITE_REPORTS,
          regionId: 1,
        }],
      });

      getFileById.mockResolvedValueOnce({
        id: 123,
        key: 'key',
        communicationLogFiles: [{
          communicationLogId: 456,
          fileId: 123,
        }],
      });

      logById.mockResolvedValue({
        userId: 1,
        id: 456,
      });

      await deleteHandler(mockRequest, mockResponse);

      expect(deleteCommunicationLogFile).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(204);
    });

    it('deletes a session supporting attachment', async () => {
      const mockRequest = {
        params: {
          fileId: '123',
          sessionAttachmentId: '456',
        },
        user: {
          id: 1,
        },
      };

      currentUserId.mockResolvedValue(1);
      userById.mockResolvedValue({
        id: 1,
        permissions: [{
          scopeId: SCOPES.READ_WRITE_REPORTS,
          regionId: 1,
        }],
      });

      findSessionById.mockResolvedValueOnce({
        id: 456,
        eventId: 789,
      });

      findEventBySmartsheetIdSuffix.mockResolvedValueOnce({
        id: 789,
        ownerId: 1,
        collaboratorIds: [],
        pocIds: [],
      });

      getFileById.mockResolvedValueOnce({
        id: 123,
        key: 'key',
        supportingAttachments: [{
          sessionReportId: 456,
          fileId: 123,
        }],
      });

      logById.mockResolvedValue({
        userId: 1,
        id: 456,
      });

      await deleteHandler(mockRequest, mockResponse);

      expect(deleteSessionSupportingAttachment).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(204);
    });
  });

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
});
