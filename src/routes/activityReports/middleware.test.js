import { APPROVER_STATUSES } from '@ttahub/common';
import { checkReviewReportBody } from './middleware';
import { auditLogger } from '../../logger';

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
