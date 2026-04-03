import { BAD_REQUEST } from 'http-codes';
import { checkGoalDashboardQuery } from './middleware';

describe('goals dashboard middleware', () => {
  const next = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows a valid dashboard query', () => {
    const req = {
      query: {
        'region.in': ['1', '2'],
      },
    };

    const res = {
      status: jest.fn(() => ({ send: jest.fn() })),
    };

    checkGoalDashboardQuery(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('allows region.in[] notation', () => {
    const req = {
      query: {
        'region.in[]': '3',
      },
    };

    const res = {
      status: jest.fn(() => ({ send: jest.fn() })),
    };

    checkGoalDashboardQuery(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects malformed region ids', () => {
    const send = jest.fn();
    const req = {
      query: {
        'region.in': ['1', 'abc'],
      },
    };

    const res = {
      status: jest.fn(() => ({ send })),
    };

    checkGoalDashboardQuery(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(BAD_REQUEST);
    expect(send).toHaveBeenCalledWith(expect.stringContaining('Received malformed goal dashboard request query'));
  });
});
