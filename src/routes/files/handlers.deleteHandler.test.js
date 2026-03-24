import {
  ActivityReport,
} from '../../models';
import ActivityReportPolicy from '../../policies/activityReport';
import CommunicationLogPolicy from '../../policies/communicationLog';
import EventPolicy from '../../policies/event';
import { logById } from '../../services/communicationLog';
import * as Files from '../../services/files';
import {
  deleteFile,
  getFileById,
} from '../../services/files';
import { findSessionById } from '../../services/sessionReports';
import { userById } from '../../services/users';
import { deleteActivityReportObjectiveFile, deleteHandler } from './handlers';
import handleErrors from '../../lib/apiErrorHandler';
import { currentUserId } from '../../services/currentUser';

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
  deleteFile: jest.fn(),
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
jest.mock('../../lib/apiErrorHandler', () => jest.fn());

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
    jest.clearAllMocks();
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
    jest.spyOn(require('../../services/event'), 'findEventBySmartsheetId').mockResolvedValueOnce({ id: 1 });
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
    jest.spyOn(require('../../services/event'), 'findEventBySmartsheetId').mockResolvedValueOnce({ id: 1 });
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

  it('returns 401 if user is not authorized for communication log', async () => {
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
        sessionAttachmentId: undefined,
      },
    };

    await deleteHandler(mockReq, mockRes);

    expect(mockRes.sendStatus).toHaveBeenCalledWith(401);
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
        sessionAttachmentId: undefined,
      },
    };

    await deleteHandler(mockReq, mockRes);

    expect(Files.deleteCommunicationLogFile).toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(204);
    expect(mockRes.send).toHaveBeenCalled();
  });

  it('returns 401 if user is not authorized for session attachment', async () => {
    getFileById.mockResolvedValue({ supportingAttachments: [{ sessionReportPilotId: 1 }] });
    findSessionById.mockResolvedValue({ eventId: 1 });
    // eslint-disable-next-line global-require
    jest.spyOn(require('../../services/event'), 'findEventBySmartsheetId').mockResolvedValueOnce({ id: 1 });
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

    expect(mockRes.sendStatus).toHaveBeenCalledWith(401);
  });

  it('deletes session attachment file if authorized', async () => {
    getFileById.mockResolvedValue({ supportingAttachments: [{ sessionReportPilotId: 1 }] });
    findSessionById.mockResolvedValue({ eventId: 1 });
    // eslint-disable-next-line global-require
    jest.spyOn(require('../../services/event'), 'findEventBySmartsheetId').mockResolvedValueOnce({ id: 1 });
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

  it('deletes file if no associated records remain', async () => {
    const deleteReq = {
      params: {
        reportId: undefined,
        fileId: 1,
        eventSessionId: undefined,
        communicationLogId: undefined,
        sessionAttachmentId: undefined,
      },
    };
    getFileById.mockResolvedValue({
      reports: [],
      reportObjectiveFiles: [],
      objectiveFiles: [],
      objectiveTemplateFiles: [],
      sessionFiles: [],
    });

    await deleteHandler(deleteReq, mockRes);

    expect(deleteFile).toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(204);
    expect(mockRes.send).toHaveBeenCalled();
  });

  it('handles file with associated records correctly', async () => {
    const deleteReq = {
      params: {
        reportId: undefined,
        fileId: 1,
        eventSessionId: undefined,
        communicationLogId: undefined,
        sessionAttachmentId: undefined,
      },
    };
    getFileById.mockResolvedValue({
      reports: [{ id: 1 }],
      reportObjectiveFiles: [{ id: 1 }],
      objectiveFiles: [{ id: 1 }],
      objectiveTemplateFiles: [{ id: 1 }],
      sessionFiles: [],
    });

    await deleteHandler(deleteReq, mockRes);

    expect(deleteFile).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(204);
    expect(mockRes.send).toHaveBeenCalled();
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
