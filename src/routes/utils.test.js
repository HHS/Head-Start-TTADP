import httpCodes from 'http-codes';
import { DECIMAL_BASE } from '@ttahub/common';
import {
  checkRecipientAccessAndExistence,
} from './utils';
import { getUserReadRegions } from '../services/accessValidation';
import { currentUserId } from '../services/currentUser';
import { recipientById, allArUserIdsByRecipientAndRegion } from '../services/recipient';
import { userById } from '../services/users';

jest.mock('../services/accessValidation');
jest.mock('../services/currentUser');
jest.mock('../services/recipient');
jest.mock('../services/users');

const mockResponse = () => {
  const res = {};
  res.sendStatus = jest.fn().mockReturnValue(res);
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

const mockRequest = (params = {}, body = {}, session = {}) => ({
  params,
  body,
  session,
  query: {},
});

describe('Route Utils', () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    res = mockResponse();
    currentUserId.mockResolvedValue(1);
    getUserReadRegions.mockResolvedValue([1, 2, 3]);
    userById.mockResolvedValue({ id: 1, permissions: [] });
    recipientById.mockResolvedValue({ id: 10, name: 'Test Recipient' });
    allArUserIdsByRecipientAndRegion.mockResolvedValue([1, 2]);
  });

  describe('checkRecipientAccessAndExistence', () => {
    it('returns false and 403 if user cannot access region', async () => {
      getUserReadRegions.mockResolvedValue([2, 3]); // User can't access region 1
      req = mockRequest({ recipientId: '10', regionId: '1' });
      const result = await checkRecipientAccessAndExistence(req, res);
      expect(result).toBe(false);
      expect(res.sendStatus).toHaveBeenCalledWith(httpCodes.FORBIDDEN);
    });

    it('returns false and 404 if recipient not found', async () => {
      recipientById.mockResolvedValue(null);
      req = mockRequest({ recipientId: '99', regionId: '1' }); // User can access region 1
      const result = await checkRecipientAccessAndExistence(req, res);
      expect(result).toBe(false);
      expect(res.sendStatus).toHaveBeenCalledWith(httpCodes.NOT_FOUND);
    });

    it('returns true if user has access and recipient exists', async () => {
      req = mockRequest({ recipientId: '10', regionId: '1' });
      const result = await checkRecipientAccessAndExistence(req, res);
      expect(result).toBe(true);
      expect(res.sendStatus).not.toHaveBeenCalled();
    });
  });
});
