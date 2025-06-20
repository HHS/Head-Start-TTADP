import canWriteReportsInRegionMiddleware from './canWriteReportsInRegionMiddleware';
import { auditLogger } from '../logger';
import { currentUserId } from '../services/currentUser';
import ActivityReportPolicy from '../policies/activityReport';
import { userById } from '../services/users';

jest.mock('../logger');
jest.mock('../services/currentUser');
jest.mock('../policies/activityReport');
jest.mock('../services/users');

describe('canWriteReportsInRegionMiddleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      params: {
        regionId: 1,
      },
    };
    res = {
      sendStatus: jest.fn(),
    };
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call next if user can write reports in region', async () => {
    currentUserId.mockResolvedValue(1);
    userById.mockResolvedValue({ id: 1 });
    ActivityReportPolicy.mockImplementation(() => ({
      canWriteInRegion: () => true,
    }));

    await canWriteReportsInRegionMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.sendStatus).not.toHaveBeenCalled();
  });

  it('should send 403 if user cannot write reports in region', async () => {
    currentUserId.mockResolvedValue(1);
    userById.mockResolvedValue({ id: 1 });
    ActivityReportPolicy.mockImplementation(() => ({
      canWriteInRegion: () => false,
    }));

    await canWriteReportsInRegionMiddleware(req, res, next);

    expect(res.sendStatus).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
    expect(auditLogger.warn).toHaveBeenCalledWith('User 1 denied access to region 1');
  });
});
