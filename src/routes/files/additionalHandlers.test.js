import SCOPES from '../../middleware/scopeConstants';
import db from '../../models';
import { logById } from '../../services/communicationLog';
import { currentUserId } from '../../services/currentUser';
import { findEventBySmartsheetId } from '../../services/event';
import {
  deleteCommunicationLogFile,
  deleteSessionSupportingAttachment,
  getFileById,
} from '../../services/files';
import { findSessionById } from '../../services/sessionReports';
import { userById } from '../../services/users';
import { deleteHandler } from './handlers';

jest.mock('../../services/communicationLog', () => ({
  logById: jest.fn(),
}));

jest.mock('../../services/sessionReports', () => ({
  findSessionById: jest.fn(),
}));

jest.mock('../../services/event', () => ({
  findEventBySmartsheetId: jest.fn(),
}));

jest.mock('../../services/files', () => ({
  ...jest.requireActual('../../services/files'),
  removeOrphanedFiles: jest.fn(),
  getFileById: jest.fn(),
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

jest.mock('../../services/s3Queue', () => ({
  addDeleteFileToQueue: jest.fn(),
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
        communicationLogFiles: [
          {
            communicationLogId: 456,
            fileId: 123,
          },
        ],
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
        permissions: [
          {
            scopeId: SCOPES.READ_WRITE_REPORTS,
            regionId: 1,
          },
        ],
      });

      findSessionById.mockResolvedValueOnce({
        id: 456,
        eventId: 789,
      });

      findEventBySmartsheetId.mockResolvedValueOnce({
        id: 789,
        ownerId: 1,
        collaboratorIds: [],
        pocIds: [],
      });

      getFileById.mockResolvedValueOnce({
        id: 123,
        key: 'key',
        supportingAttachments: [
          {
            sessionReportPilotId: 456,
            fileId: 123,
          },
        ],
      });

      logById.mockResolvedValue({
        userId: 1,
        id: 456,
      });

      await deleteHandler(mockRequest, mockResponse);

      expect(deleteSessionSupportingAttachment).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(204);
    });

    it('rethrows caught errors when running inside transactionWrapper', async () => {
      const error = new Error('delete failed');
      const mockRequest = {
        inTransactionWrapper: true,
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
        permissions: [
          {
            scopeId: SCOPES.READ_WRITE_REPORTS,
            regionId: 1,
          },
        ],
      });
      getFileById.mockRejectedValueOnce(error);

      await expect(deleteHandler(mockRequest, mockResponse)).rejects.toThrow(error);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });
});
