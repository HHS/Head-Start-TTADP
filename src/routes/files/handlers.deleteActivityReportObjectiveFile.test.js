import ActivityReportPolicy from '../../policies/activityReport';
import * as Files from '../../services/files';
import { currentUserId } from '../../services/currentUser';
import { getFileById } from '../../services/files';
import { userById } from '../../services/users';
import { deleteActivityReportObjectiveFile } from './handlers';

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
jest.mock('../../services/currentUser', () => ({
  currentUserId: jest.fn(),
}));
jest.mock('../../services/files', () => ({
  ...jest.requireActual('../../services/files'),
  getFileById: jest.fn(),
  deleteSpecificActivityReportObjectiveFile: jest.fn(),
}));
jest.mock('../../services/users');

describe('deleteActivityReportObjectiveFile', () => {
  const mockReq = {
    params: {
      fileId: 1,
      reportId: 1,
    },
    body: {
      objectiveIds: [1, 2],
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
    currentUserId.mockResolvedValue(mockUser.id);
    userById.mockResolvedValue(mockUser);
  });

  it('returns 404 if report is not found', async () => {
    // eslint-disable-next-line global-require
    jest.spyOn(require('../../services/activityReports'), 'activityReportAndRecipientsById').mockResolvedValueOnce([]);
    await deleteActivityReportObjectiveFile(mockReq, mockRes);
    expect(mockRes.sendStatus).toHaveBeenCalledWith(404);
  });

  it('returns 404 if file is not found', async () => {
    // eslint-disable-next-line global-require
    jest.spyOn(require('../../services/activityReports'), 'activityReportAndRecipientsById').mockResolvedValueOnce([{ id: 1 }]);
    getFileById.mockResolvedValue(null);
    await deleteActivityReportObjectiveFile(mockReq, mockRes);
    expect(mockRes.sendStatus).toHaveBeenCalledWith(404);
  });

  it('returns 403 if user is not authorized to update report', async () => {
    // eslint-disable-next-line global-require
    jest.spyOn(require('../../services/activityReports'), 'activityReportAndRecipientsById').mockResolvedValueOnce([{ id: 1 }]);
    getFileById.mockResolvedValue({ id: 1 });
    const mockPolicy = { canUpdate: jest.fn().mockReturnValue(false) };
    ActivityReportPolicy.mockImplementation(() => mockPolicy);
    await deleteActivityReportObjectiveFile(mockReq, mockRes);
    expect(mockRes.sendStatus).toHaveBeenCalledWith(403);
  });

  it('deletes specific activity report objective file if authorized', async () => {
    // eslint-disable-next-line global-require
    jest.spyOn(require('../../services/activityReports'), 'activityReportAndRecipientsById').mockResolvedValueOnce([{ id: 1 }]);
    getFileById.mockResolvedValue({ id: 1 });
    const mockPolicy = { canUpdate: jest.fn().mockReturnValue(true) };
    ActivityReportPolicy.mockImplementation(() => mockPolicy);
    await deleteActivityReportObjectiveFile(mockReq, mockRes);
    expect(Files.deleteSpecificActivityReportObjectiveFile).toHaveBeenCalledWith(1, 1, [1, 2]);
    expect(mockRes.status).toHaveBeenCalledWith(204);
    expect(mockRes.send).toHaveBeenCalled();
  });
});
