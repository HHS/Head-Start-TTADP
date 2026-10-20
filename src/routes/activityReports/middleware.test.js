import { APPROVER_STATUSES } from '@ttahub/common';
import { auditLogger } from '../../logger';
import { checkReviewReportBody, checkSubmitReportBody } from './middleware';

jest.mock('../../logger', () => ({
  auditLogger: {
    error: jest.fn(),
  },
}));

describe('activityReports reviewReport middleware', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('calls next for a valid approved review payload', () => {
    const req = {
      body: {
        status: APPROVER_STATUSES.APPROVED,
        note: 'Looks good',
        approvedAtTimezone: 'America/New_York',
      },
    };
    const send = jest.fn();
    const res = {
      status: jest.fn(() => ({ send })),
    };
    const next = jest.fn();

    checkReviewReportBody(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 400 when approved status is missing approvedAtTimezone', () => {
    const req = {
      body: {
        status: APPROVER_STATUSES.APPROVED,
        note: 'Looks good',
      },
    };
    const send = jest.fn();
    const res = {
      status: jest.fn(() => ({ send })),
    };
    const next = jest.fn();

    checkReviewReportBody(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(send).toHaveBeenCalled();
    expect(auditLogger.error).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 for an invalid approvedAtTimezone', () => {
    const req = {
      body: {
        status: APPROVER_STATUSES.APPROVED,
        note: 'Looks good',
        approvedAtTimezone: 'Mars/Olympus_Mons',
      },
    };
    const send = jest.fn();
    const res = {
      status: jest.fn(() => ({ send })),
    };
    const next = jest.fn();

    checkReviewReportBody(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(send).toHaveBeenCalled();
    expect(auditLogger.error).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('allows note & approvedAtTimezone to be omitted for needs action payloads', () => {
    const req = {
      body: {
        status: APPROVER_STATUSES.NEEDS_ACTION,
      },
    };
    const send = jest.fn();
    const res = {
      status: jest.fn(() => ({ send })),
    };
    const next = jest.fn();

    checkReviewReportBody(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 400 for an invalid payload', () => {
    const req = {
      body: {
        status: 'draft',
        note: 123,
      },
    };
    const send = jest.fn();
    const res = {
      status: jest.fn(() => ({ send })),
    };
    const next = jest.fn();

    checkReviewReportBody(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(send).toHaveBeenCalled();
    expect(auditLogger.error).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});

describe('activityReports submitReport middleware', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockResponse = () => {
    const send = jest.fn();
    return {
      send,
      res: {
        status: jest.fn(() => ({ send })),
      },
    };
  };

  it('returns 400 when approverUserIds is missing', () => {
    const mockRequest = {
      body: {},
    };
    const { res, send } = mockResponse();
    const mockNext = jest.fn();

    checkSubmitReportBody(mockRequest, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(send).toHaveBeenCalled();
    expect(auditLogger.error).toHaveBeenCalled();
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('returns 400 when approverUserIds is empty', () => {
    const mockRequest = {
      body: {
        approverUserIds: [],
      },
    };
    const { res, send } = mockResponse();
    const mockNext = jest.fn();

    checkSubmitReportBody(mockRequest, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(send).toHaveBeenCalled();
    expect(auditLogger.error).toHaveBeenCalled();
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('returns 400 when approverUserIds contains non-integers', () => {
    const mockRequest = {
      body: {
        approverUserIds: ['abc'],
      },
    };
    const { res, send } = mockResponse();
    const mockNext = jest.fn();

    checkSubmitReportBody(mockRequest, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(send).toHaveBeenCalled();
    expect(auditLogger.error).toHaveBeenCalled();
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('returns 400 when approverUserIds contains a negative number', () => {
    const mockRequest = {
      body: {
        approverUserIds: [-1],
      },
    };
    const { res, send } = mockResponse();
    const mockNext = jest.fn();

    checkSubmitReportBody(mockRequest, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(send).toHaveBeenCalled();
    expect(auditLogger.error).toHaveBeenCalled();
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('calls next when approverUserIds is a non-empty array of positive integers', () => {
    const mockRequest = {
      body: {
        approverUserIds: [1, 2],
      },
    };
    const { res } = mockResponse();
    const mockNext = jest.fn();

    checkSubmitReportBody(mockRequest, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('calls next when unknown fields are included in the request body', () => {
    const mockRequest = {
      body: {
        approverUserIds: [1, 2],
        notes: 'keep this field',
        nested: {
          arbitrary: true,
        },
      },
    };
    const { res } = mockResponse();
    const mockNext = jest.fn();

    checkSubmitReportBody(mockRequest, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
