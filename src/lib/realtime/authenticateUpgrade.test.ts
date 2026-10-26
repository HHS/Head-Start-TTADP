import type { IncomingMessage } from 'node:http';
import type { RequestHandler } from 'express';
import db from '../../models';
import { validateUserAuthForAccess } from '../../services/accessValidation';
import { currentUserId } from '../../services/currentUser';
import authenticateUpgrade from './authenticateUpgrade';

jest.mock('../../middleware/sessionMiddleware', () => jest.fn());
jest.mock('../../models', () => ({ User: { findByPk: jest.fn() } }));
jest.mock('../../services/currentUser', () => ({ currentUserId: jest.fn() }));
jest.mock('../../services/accessValidation', () => ({ validateUserAuthForAccess: jest.fn() }));

const findByPk = db.User.findByPk as jest.Mock;
const mockCurrentUserId = currentUserId as jest.Mock;
const mockHasAccess = validateUserAuthForAccess as jest.Mock;

const loadsSession: RequestHandler = (req, _res, next) => {
  (req as unknown as { session: object }).session = { userId: 4 };
  next();
};

const upgradeRequest = (url = '/') => ({ url, headers: {} }) as IncomingMessage;

describe('authenticateUpgrade', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockCurrentUserId.mockResolvedValue(4);
    mockHasAccess.mockResolvedValue(true);
    findByPk.mockImplementation(async (id) => ({ id, name: `User ${id}` }));
  });

  it('resolves the effective user with the same flow as the HTTP API', async () => {
    const req = upgradeRequest();

    const user = await authenticateUpgrade(req, loadsSession);

    expect(user).toEqual({ userId: 4, username: 'User 4' });
    // the session is loaded before currentUserId reads it
    expect(mockCurrentUserId).toHaveBeenCalledWith(
      expect.objectContaining({ session: { userId: 4 } }),
      expect.any(Object)
    );
    expect(mockHasAccess).toHaveBeenCalledWith(4);
    expect(findByPk).toHaveBeenCalledWith(4, { attributes: ['id', 'name'] });
  });

  it('passes the impersonation query param to currentUserId as the header', async () => {
    mockCurrentUserId.mockImplementation(async (req) =>
      Number(req.headers['auth-impersonation-id'])
    );
    const req = upgradeRequest('/?impersonationId=9');

    const user = await authenticateUpgrade(req, loadsSession);

    expect(req.headers['auth-impersonation-id']).toBe('9');
    expect(user).toEqual({ userId: 9, username: 'User 9' });
  });

  it('rejects when currentUserId refuses the request, e.g. an invalid impersonation', async () => {
    mockCurrentUserId.mockImplementation(async (_req, res) => res.sendStatus(401));

    expect(await authenticateUpgrade(upgradeRequest('/?impersonationId=1'), loadsSession)).toBe(
      null
    );
    expect(findByPk).not.toHaveBeenCalled();
  });

  it('rejects when currentUserId hits an error', async () => {
    mockCurrentUserId.mockImplementation(async (_req, res) => res.status(500).end());

    expect(await authenticateUpgrade(upgradeRequest(), loadsSession)).toBeNull();
  });

  it('rejects when there is no logged in user', async () => {
    mockCurrentUserId.mockResolvedValue(null);

    expect(await authenticateUpgrade(upgradeRequest(), loadsSession)).toBeNull();
    expect(mockHasAccess).not.toHaveBeenCalled();
  });

  it('rejects users without SITE_ACCESS', async () => {
    mockHasAccess.mockResolvedValue(false);

    expect(await authenticateUpgrade(upgradeRequest(), loadsSession)).toBeNull();
    expect(findByPk).not.toHaveBeenCalled();
  });

  it('rejects when the user no longer exists', async () => {
    findByPk.mockResolvedValue(null);

    expect(await authenticateUpgrade(upgradeRequest(), loadsSession)).toBeNull();
  });

  it('rejects when the session store errors', async () => {
    const failingSession: RequestHandler = (_req, _res, next) => next(new Error('redis down'));

    await expect(authenticateUpgrade(upgradeRequest(), failingSession)).rejects.toThrow(
      'redis down'
    );
  });
});
