import httpCodes from 'http-codes';
import { auditLogger } from '../../logger';
import { checkRecipientTimelineQuery } from './middleware';

jest.mock('../../logger', () => ({
  auditLogger: {
    error: jest.fn(),
  },
}));

const mockResponse = () => {
  const res = {
    locals: {},
    send: jest.fn(),
    status: jest.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
};

describe('checkRecipientTimelineQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('applies conservative defaults when query parameters are omitted', () => {
    const req = { query: {} };
    const res = mockResponse();
    const next = jest.fn();

    checkRecipientTimelineQuery(req, res, next);

    expect(res.locals.recipientTimelineQuery).toEqual({
      limit: 20,
      offset: 0,
      sortBy: 'date',
      direction: 'desc',
      filters: [],
    });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('parses valid pagination and filter values', () => {
    const req = {
      query: {
        limit: '25',
        offset: '10',
        sortBy: 'date',
        direction: 'asc',
        filters: ['one', 'two'],
      },
    };
    const res = mockResponse();
    const next = jest.fn();

    checkRecipientTimelineQuery(req, res, next);

    expect(res.locals.recipientTimelineQuery).toEqual({
      limit: 25,
      offset: 10,
      sortBy: 'date',
      direction: 'asc',
      filters: ['one', 'two'],
    });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['non-positive limit', { limit: '0' }],
    ['negative offset', { offset: '-1' }],
    ['unsupported sort field', { sortBy: 'title' }],
    ['unsupported direction', { direction: 'sideways' }],
    ['structured filters', { filters: { key: 'value' } }],
    ['unknown query parameter', { extra: 'value' }],
  ])('rejects %s', (_description, query) => {
    const req = { query };
    const res = mockResponse();
    const next = jest.fn();

    checkRecipientTimelineQuery(req, res, next);

    expect(res.status).toHaveBeenCalledWith(httpCodes.BAD_REQUEST);
    expect(res.send).toHaveBeenCalledWith(
      expect.stringContaining('Received malformed request query')
    );
    expect(auditLogger.error).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});
