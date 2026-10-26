import httpContext from 'express-http-context';
import { broadcastRoom } from '../../lib/realtime';
import { revisionBumpBroadcast } from './activityReport';

jest.mock('../../lib/realtime', () => ({ broadcastRoom: jest.fn() }));
jest.mock('express-http-context', () => ({ get: jest.fn() }));

const reportWithRevision = (previous, current) => ({
  id: 12,
  revision: current,
  previous: (field) => (field ? previous : { revision: previous }),
});

describe('revisionBumpBroadcast', () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env, NODE_ENV: 'development' };
    delete process.env.BYPASS_SOCKETS;
    broadcastRoom.mockReset();
    httpContext.get.mockImplementation((key) => (key === 'loggedUser' ? 3 : undefined));
  });

  afterAll(() => {
    process.env = env;
  });

  it('broadcasts the new revision to the report room', async () => {
    await revisionBumpBroadcast(null, reportWithRevision(1, 2));

    expect(broadcastRoom).toHaveBeenCalledWith('ar-12', 'revision-updated', {
      reportId: 12,
      revision: 2,
      userId: 3,
      timestamp: expect.any(String),
    });
  });

  it('does nothing when the revision did not change', async () => {
    await revisionBumpBroadcast(null, reportWithRevision(2, 2));

    expect(broadcastRoom).not.toHaveBeenCalled();
  });

  it('does nothing when sockets are bypassed', async () => {
    process.env.BYPASS_SOCKETS = 'true';

    await revisionBumpBroadcast(null, reportWithRevision(1, 2));

    expect(broadcastRoom).not.toHaveBeenCalled();
  });

  it('does not throw when the broadcast fails', async () => {
    broadcastRoom.mockRejectedValue(new Error('redis down'));

    await expect(revisionBumpBroadcast(null, reportWithRevision(1, 2))).resolves.toBeUndefined();
  });
});
