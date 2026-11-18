import handleErrors from '../../lib/apiErrorHandler';
import { deleteFileFromS3 } from '../../lib/s3';
import { ActivityReport } from '../../models';
import ActivityReportPolicy from '../../policies/activityReport';
import CommunicationLogPolicy from '../../policies/communicationLog';
import EventPolicy from '../../policies/event';
import { logById } from '../../services/communicationLog';
import { currentUserId } from '../../services/currentUser';
import * as Files from '../../services/files';
import {
  deleteActivityReportFile,
  deleteCommunicationLogFile,
  deleteSessionSupportingAttachment,
  getFileById,
  removeOrphanedFiles,
} from '../../services/files';
import { findSessionById } from '../../services/sessionReports';
import { userById } from '../../services/users';
import { deleteActivityReportObjectiveFile, deleteHandler } from './handlers';

jest.mock('../../services/scanQueue', () => jest.fn());
jest.mock('bull');
jest.mock('../../policies/activityReport');
jest.mock('../../policies/user');
jest.mock('../../policies/objective');
jest.mock('../../services/accessValidation', () => ({
  validateUserAuthForAdmin: jest.fn().mockResolvedValue(false),
  validateUserAuthForAccess: jest.fn().mockResolvedValue(true),
}));
jest.mock('axios');
jest.mock('smartsheet');
jest.mock('../../services/users');
jest.mock('../../services/currentUser');
jest.mock('../../services/files', () => ({
  ...jest.requireActual('../../services/files'),
  deleteActivityReportFile: jest.fn(),
  removeOrphanedFiles: jest.fn(),
  deleteFileFromS3: jest.fn(),
  deleteSessionFile: jest.fn(),
  deleteCommunicationLogFile: jest.fn(),
  getFileById: jest.fn(),
  deleteSessionSupportingAttachment: jest.fn(),
  deleteSpecificActivityReportObjectiveFile: jest.fn(),
}));
jest.mock('../../services/sessionReports');
jest.mock('../../services/communicationLog');
jest.mock('../../services/currentUser');
jest.mock('../../policies/event');
jest.mock('../../policies/communicationLog');
jest.mock('../../policies/user');
jest.mock('../../lib/s3', () => ({
  deleteFileFromS3: jest.fn(),
  uploadFile: jest.fn(),
}));
jest.mock('../../lib/apiErrorHandler', () => jest.fn());

const noReferences = {
  reportFiles: [],
  reportObjectiveFiles: [],
  sessionFiles: [],
  communicationLogFiles: [],
  supportingAttachments: [],
  importFile: null,
};

// Mimics transactionWrapper: flags the request and runs post-commit callbacks.
const runInTransaction = async (handler, req, res) => {
  const wrappedReq = { ...req, inTransactionWrapper: true, transactionCommittedCallbacks: [] };
  await handler(wrappedReq, res);
  for (const callback of wrappedReq.transactionCommittedCallbacks) {
    // eslint-disable-next-line no-await-in-loop
    await callback();
  }
  return wrappedReq;
};

describe('deleteHandler', () => {
  const mockReq = {
    params: {
      reportId: 1,
      fileId: 1,
      eventSessionId: 1,
      communicationLogId: 1,
      sessionAttachmentId: 1,
    },
  };
  const mockRes = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
    sendStatus: jest.fn(),
    end: jest.fn(),
  };
  // eslint-disable-next-line @typescript-eslint/no-shadow
  const mockUser = { id: 1 };

  beforeEach(() => {
    // jest.clearAllMocks();
    userById.mockResolvedValue(mockUser);
  });

  it('returns 403 if user is not authorized for report', async () => {
    getFileById.mockResolvedValue({ reportFiles: [{ activityReportId: 1 }] });
    jest.spyOn(ActivityReport, 'findOne').mockResolvedValueOnce({ id: 1 });
    const mockPolicy = { canUpdate: jest.fn().mockReturnValue(false) };
    ActivityReportPolicy.mockImplementation(() => mockPolicy);

    await deleteHandler(mockReq, mockRes);

    expect(mockRes.sendStatus).toHaveBeenCalledWith(403);
  });

  // eslint-disable-next-line jest/no-commented-out-tests
  // it('deletes activity report file if authorized', async () => {
  //   getFileById.mockResolvedValue({ reportFiles: [{ activityReportId: 1 }] });
  //   jest.spyOn(ActivityReport, 'findOne').mockResolvedValueOnce({ id: 1 });
  //   const mockPolicy = { canUpdate: jest.fn().mockReturnValue(true) };
  //   ActivityReportPolicy.mockImplementation(() => mockPolicy);

  //   await deleteHandler(mockReq, mockRes);

  //   expect(deleteActivityReportFile).toHaveBeenCalled();
  //   expect(mockRes.status).toHaveBeenCalledWith(204);
  //   expect(mockRes.send).toHaveBeenCalled();
  // });

  it('returns 403 if user is not authorized for event session', async () => {
    getFileById.mockResolvedValue({ sessionFiles: [{ sessionReportPilotId: 1 }] });
    findSessionById.mockResolvedValue({ eventId: 1 });
    // eslint-disable-next-line global-require
    jest
      .spyOn(require('../../services/event'), 'findEventBySmartsheetId')
      .mockResolvedValueOnce({ id: 1 });
    const mockPolicy = { canUploadFile: jest.fn().mockReturnValue(false) };
    EventPolicy.mockImplementation(() => mockPolicy);

    // eslint-disable-next-line @typescript-eslint/no-shadow
    const mockReq = {
      params: {
        reportId: undefined,
        fileId: 1,
        eventSessionId: 1,
        communicationLogId: 1,
        sessionAttachmentId: 1,
      },
    };

    await deleteHandler(mockReq, mockRes);

    expect(mockRes.sendStatus).toHaveBeenCalledWith(403);
  });

  it('deletes session file if authorized', async () => {
    getFileById.mockResolvedValue({ sessionFiles: [{ sessionReportPilotId: 1 }] });
    findSessionById.mockResolvedValue({ eventId: 1 });
    // eslint-disable-next-line global-require
    jest
      .spyOn(require('../../services/event'), 'findEventBySmartsheetId')
      .mockResolvedValueOnce({ id: 1 });
    const mockPolicy = { canUploadFile: jest.fn().mockReturnValue(true) };
    EventPolicy.mockImplementation(() => mockPolicy);

    // eslint-disable-next-line @typescript-eslint/no-shadow
    const mockReq = {
      params: {
        reportId: undefined,
        fileId: 1,
        eventSessionId: 1,
        communicationLogId: 1,
        sessionAttachmentId: 1,
      },
    };

    await deleteHandler(mockReq, mockRes);

    expect(Files.deleteSessionFile).toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(204);
    expect(mockRes.send).toHaveBeenCalled();
  });

  it('returns 403 if user is not authorized for communication log', async () => {
    getFileById.mockResolvedValue({ communicationLogFiles: [{ communicationLogId: 1 }] });
    logById.mockResolvedValue({ id: 1 });
    const mockPolicy = { canUploadFileToLog: jest.fn().mockReturnValue(false) };
    CommunicationLogPolicy.mockImplementation(() => mockPolicy);

    // eslint-disable-next-line @typescript-eslint/no-shadow
    const mockReq = {
      params: {
        reportId: undefined,
        fileId: 1,
        eventSessionId: undefined,
        communicationLogId: 1,
        sessionAttachmentId: 1,
      },
    };

    await deleteHandler(mockReq, mockRes);

    expect(mockRes.sendStatus).toHaveBeenCalledWith(403);
  });

  it('deletes communication log file if authorized', async () => {
    getFileById.mockResolvedValue({ communicationLogFiles: [{ communicationLogId: 1 }] });
    logById.mockResolvedValue({ id: 1 });
    const mockPolicy = { canUploadFileToLog: jest.fn().mockReturnValue(true) };
    CommunicationLogPolicy.mockImplementation(() => mockPolicy);

    // eslint-disable-next-line @typescript-eslint/no-shadow
    const mockReq = {
      params: {
        reportId: undefined,
        fileId: 1,
        eventSessionId: undefined,
        communicationLogId: 1,
        sessionAttachmentId: 1,
      },
    };

    await deleteHandler(mockReq, mockRes);

    expect(Files.deleteCommunicationLogFile).toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(204);
    expect(mockRes.send).toHaveBeenCalled();
  });

  it('returns 403 if user is not authorized for session attachment', async () => {
    getFileById.mockResolvedValue({ supportingAttachments: [{ sessionReportPilotId: 1 }] });
    findSessionById.mockResolvedValue({ eventId: 1 });
    // eslint-disable-next-line global-require
    jest
      .spyOn(require('../../services/event'), 'findEventBySmartsheetId')
      .mockResolvedValueOnce({ id: 1 });
    const mockPolicy = { canUploadFile: jest.fn().mockReturnValue(false) };
    EventPolicy.mockImplementation(() => mockPolicy);

    // eslint-disable-next-line @typescript-eslint/no-shadow
    const mockReq = {
      params: {
        reportId: undefined,
        fileId: 1,
        eventSessionId: undefined,
        communicationLogId: undefined,
        sessionAttachmentId: 1,
      },
    };

    await deleteHandler(mockReq, mockRes);

    expect(mockRes.sendStatus).toHaveBeenCalledWith(403);
  });

  it('deletes session attachment file if authorized', async () => {
    getFileById.mockResolvedValue({ supportingAttachments: [{ sessionReportPilotId: 1 }] });
    findSessionById.mockResolvedValue({ eventId: 1 });
    // eslint-disable-next-line global-require
    jest
      .spyOn(require('../../services/event'), 'findEventBySmartsheetId')
      .mockResolvedValueOnce({ id: 1 });
    const mockPolicy = { canUploadFile: jest.fn().mockReturnValue(true) };
    EventPolicy.mockImplementation(() => mockPolicy);

    // eslint-disable-next-line @typescript-eslint/no-shadow
    const mockReq = {
      params: {
        reportId: undefined,
        fileId: 1,
        eventSessionId: undefined,
        communicationLogId: undefined,
        sessionAttachmentId: 1,
      },
    };

    await deleteHandler(mockReq, mockRes);

    expect(Files.deleteSessionSupportingAttachment).toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(204);
    expect(mockRes.send).toHaveBeenCalled();
  });
});

describe('deleteHandler authorization and orphan cleanup', () => {
  const mockRes = () => ({
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
    sendStatus: jest.fn(),
  });

  const reportFile = {
    id: 1,
    key: 'key',
    ...noReferences,
    reportFiles: [{ id: 9, activityReportId: 1 }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    deleteActivityReportFile.mockResolvedValue(1);
    Files.deleteCommunicationLogFile.mockResolvedValue(1);
    Files.deleteSessionSupportingAttachment.mockResolvedValue(1);
    userById.mockResolvedValue({ id: 1 });
    jest.spyOn(ActivityReport, 'findOne').mockResolvedValue({ calculatedStatus: 'draft' });
  });

  it('refuses to remove a file from an approved report', async () => {
    const res = mockRes();
    getFileById.mockResolvedValue(reportFile);
    ActivityReportPolicy.mockImplementation(() => ({ canUpdate: () => true }));
    ActivityReport.findOne.mockResolvedValue({ calculatedStatus: 'approved' });

    await runInTransaction(deleteHandler, { params: { reportId: 1, fileId: 1 } }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(deleteActivityReportFile).not.toHaveBeenCalled();
    expect(removeOrphanedFiles).not.toHaveBeenCalled();
  });

  it.each([
    ['objective', { objectiveId: 1, fileId: 1 }],
    ['objective template', { objectiveTemplateId: 1, fileId: 1 }],
    ['no parent', { fileId: 1 }],
  ])('refuses a delete with an %s parent and deletes nothing', async (_label, params) => {
    const res = mockRes();

    const req = await runInTransaction(deleteHandler, { params }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(getFileById).not.toHaveBeenCalled();
    expect(removeOrphanedFiles).not.toHaveBeenCalled();
    expect(deleteFileFromS3).not.toHaveBeenCalled();
    expect(req.transactionCommittedCallbacks).toHaveLength(0);
  });

  it.each([
    ['report', { reportId: 1, fileId: 1 }, deleteActivityReportFile],
    ['session', { eventSessionId: 1, fileId: 1 }, Files.deleteSessionFile],
    ['communication log', { communicationLogId: 1, fileId: 1 }, deleteCommunicationLogFile],
    [
      'supporting attachment',
      { sessionAttachmentId: 1, fileId: 1 },
      deleteSessionSupportingAttachment,
    ],
  ])(
    'returns 404 and cleans up nothing when the authorized %s does not link to the file',
    async (_label, params, unlink) => {
      const res = mockRes();
      // An unrelated, unreferenced file: the user can access the parent, but not this file.
      getFileById.mockResolvedValue({ id: 1, key: 'key', ...noReferences });
      ActivityReportPolicy.mockImplementation(() => ({ canUpdate: () => true }));
      EventPolicy.mockImplementation(() => ({ canUploadFile: () => true }));
      CommunicationLogPolicy.mockImplementation(() => ({ canUploadFileToLog: () => true }));
      findSessionById.mockResolvedValue({ eventId: 1 });
      jest
        // eslint-disable-next-line global-require
        .spyOn(require('../../services/event'), 'findEventBySmartsheetId')
        .mockResolvedValue({ id: 1 });
      logById.mockResolvedValue({ id: 1 });

      const req = await runInTransaction(deleteHandler, { params }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(unlink).not.toHaveBeenCalled();
      expect(deleteFile).not.toHaveBeenCalled();
      expect(addDeleteFileToQueue).not.toHaveBeenCalled();
      expect(req.transactionCommittedCallbacks).toHaveLength(0);
    }
  );

  it('returns 404 when the file does not exist', async () => {
    const res = mockRes();
    getFileById.mockResolvedValue(null);

    await runInTransaction(deleteHandler, { params: { reportId: 1, fileId: 1 } }, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(removeOrphanedFiles).not.toHaveBeenCalled();
  });

  it('returns 403 for an unauthorized report delete and deletes nothing', async () => {
    const res = mockRes();
    getFileById.mockResolvedValue(reportFile);
    ActivityReportPolicy.mockImplementation(() => ({ canUpdate: () => false }));

    await runInTransaction(deleteHandler, { params: { reportId: 1, fileId: 1 } }, res);

    expect(res.sendStatus).toHaveBeenCalledWith(403);
    expect(deleteActivityReportFile).not.toHaveBeenCalled();
    expect(removeOrphanedFiles).not.toHaveBeenCalled();
  });

  it('leaves an unlinked file alone when the authorized report has no link to it', async () => {
    const res = mockRes();
    getFileById.mockResolvedValue({ id: 1, ...noReferences });
    ActivityReportPolicy.mockImplementation(() => ({ canUpdate: () => true }));

    await runInTransaction(deleteHandler, { params: { reportId: 1, fileId: 1 } }, res);

    expect(res.status).toHaveBeenCalledWith(204);
    expect(removeOrphanedFiles).not.toHaveBeenCalled();
  });

  it('unlinks the file, then removes it if orphaned with the S3 delete after commit', async () => {
    const res = mockRes();
    getFileById.mockResolvedValue(reportFile);
    ActivityReportPolicy.mockImplementation(() => ({ canUpdate: () => true }));
    const queueS3Delete = jest.fn();
    removeOrphanedFiles.mockImplementation(async (_ids, { afterCommit }) => {
      afterCommit(queueS3Delete);
    });

    const req = { params: { reportId: 1, fileId: 1 } };
    const wrappedReq = { ...req, inTransactionWrapper: true, transactionCommittedCallbacks: [] };
    await deleteHandler(wrappedReq, res);

    expect(deleteActivityReportFile).toHaveBeenCalledWith(9);
    expect(removeOrphanedFiles).toHaveBeenCalledWith([1], { afterCommit: expect.any(Function) });
    // The S3 delete is registered to run after commit, not run now.
    expect(queueS3Delete).not.toHaveBeenCalled();
    expect(wrappedReq.transactionCommittedCallbacks).toEqual([queueS3Delete]);
    expect(res.status).toHaveBeenCalledWith(204);
  });

  it('unlinks a communication log file and checks it for orphan cleanup', async () => {
    const res = mockRes();
    getFileById.mockResolvedValue({
      id: 1,
      key: 'key',
      ...noReferences,
      communicationLogFiles: [{ id: 5, communicationLogId: 5 }],
    });
    logById.mockResolvedValue({ id: 5 });
    CommunicationLogPolicy.mockImplementation(() => ({ canUploadFileToLog: () => true }));

    await runInTransaction(deleteHandler, { params: { communicationLogId: 5, fileId: 1 } }, res);

    expect(deleteCommunicationLogFile).toHaveBeenCalledWith(5);
    expect(removeOrphanedFiles).toHaveBeenCalledWith([1], { afterCommit: expect.any(Function) });
  });

  it('unlinks a supporting attachment and checks it for orphan cleanup', async () => {
    const res = mockRes();
    getFileById.mockResolvedValue({
      id: 1,
      key: 'key',
      ...noReferences,
      supportingAttachments: [{ id: 6, sessionReportPilotId: 6 }],
    });
    findSessionById.mockResolvedValue({ eventId: 1 });
    jest
      // eslint-disable-next-line global-require
      .spyOn(require('../../services/event'), 'findEventBySmartsheetId')
      .mockResolvedValueOnce({ id: 1 });
    EventPolicy.mockImplementation(() => ({ canUploadFile: () => true }));

    await runInTransaction(deleteHandler, { params: { sessionAttachmentId: 6, fileId: 1 } }, res);

    expect(deleteSessionSupportingAttachment).toHaveBeenCalledWith(6);
    expect(removeOrphanedFiles).toHaveBeenCalledWith([1], { afterCommit: expect.any(Function) });
  });
});

describe('deleteActivityReportObjectiveFile', () => {
  const mockReq = {
    params: {
      reportId: 1,
      objectiveId: 1,
      fileId: 1,
    },
    body: {
      objectiveIds: [],
    },
  };

  const mockRes = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
    sendStatus: jest.fn(),
    end: jest.fn(),
  };

  it('calls handleErrors if an error occurs', async () => {
    currentUserId.mockRejectedValue(new Error('test error'));
    await deleteActivityReportObjectiveFile(mockReq, mockRes);
    expect(handleErrors).toHaveBeenCalled();
  });
});
