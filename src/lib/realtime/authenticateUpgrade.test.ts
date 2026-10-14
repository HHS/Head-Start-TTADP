import type { IncomingMessage } from 'node:http';
import type { RequestHandler } from 'express';
import db from '../../models';
import authenticateUpgrade from './authenticateUpgrade';

jest.mock('../../middleware/sessionMiddleware', () => jest.fn());
jest.mock('../../models', () => ({ User: { findByPk: jest.fn() } }));

const findByPk = db.User.findByPk as jest.Mock;

const sessionWith =
  (session: object | undefined, err?: Error): RequestHandler =>
  (req, _res, next) => {
    (req as unknown as { session: object }).session = session;
    next(err);
  };

describe('authenticateUpgrade', () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env };
    delete process.env.BYPASS_AUTH;
    findByPk.mockReset();
  });

  afterAll(() => {
    process.env = env;
  });

  it('returns the session user', async () => {
    findByPk.mockResolvedValue({ id: 4, name: 'Pat' });

    const user = await authenticateUpgrade({} as IncomingMessage, sessionWith({ userId: '4' }));

    expect(user).toEqual({ userId: 4, username: 'Pat' });
    expect(findByPk).toHaveBeenCalledWith(4, { attributes: ['id', 'name'] });
  });

  it('returns null when there is no logged in user', async () => {
    const user = await authenticateUpgrade({} as IncomingMessage, sessionWith({}));

    expect(user).toBeNull();
    expect(findByPk).not.toHaveBeenCalled();
  });

  it('returns null when the session user no longer exists', async () => {
    findByPk.mockResolvedValue(null);

    expect(
      await authenticateUpgrade({} as IncomingMessage, sessionWith({ userId: 99 }))
    ).toBeNull();
  });

  it('uses CURRENT_USER_ID when auth is bypassed outside production', async () => {
    process.env.BYPASS_AUTH = 'true';
    process.env.NODE_ENV = 'test';
    process.env.CURRENT_USER_ID = '7';
    findByPk.mockResolvedValue({ id: 7, name: 'Test' });

    const user = await authenticateUpgrade({} as IncomingMessage, sessionWith(undefined));

    expect(user).toEqual({ userId: 7, username: 'Test' });
  });

  it('ignores the auth bypass in production', async () => {
    process.env.BYPASS_AUTH = 'true';
    process.env.NODE_ENV = 'production';
    process.env.CURRENT_USER_ID = '7';

    expect(await authenticateUpgrade({} as IncomingMessage, sessionWith(undefined))).toBeNull();
  });

  it('rejects when the session store errors', async () => {
    await expect(
      authenticateUpgrade({} as IncomingMessage, sessionWith(undefined, new Error('redis down')))
    ).rejects.toThrow('redis down');
  });
});
