import { COMMUNICATION_PURPOSES } from '@ttahub/common';
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
      excludeMultiRecipientCommunications: false,
    });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('translates dotted query parameters into timeline filters', () => {
    const req = {
      query: {
        limit: '25',
        offset: '10',
        sortBy: 'date',
        direction: 'asc',
        'date.win': '08/01/2025-08/01/2026',
        'purpose.nin': ['General Check-In', 'New TTA request'],
        'standard.in': 'Monitoring',
        'eventType.in': [
          'Email communication',
          'Phone communication',
          'In person communication',
        ],
        excludeMultiRecipientCommunications: 'true',
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
      filters: [
        {
          topic: 'date',
          condition: 'is within',
          query: '08/01/2025-08/01/2026',
        },
        {
          topic: 'purpose',
          condition: 'is not',
          query: ['General Check-In', 'New TTA request'],
        },
        {
          topic: 'standard',
          condition: 'is',
          query: ['Monitoring'],
        },
        {
          topic: 'eventType',
          condition: 'is',
          query: ['Email communication', 'Phone communication', 'In person communication'],
        },
      ],
      excludeMultiRecipientCommunications: true,
    });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it.each(['is', 'is not'])('accepts every defined purpose with %s', (condition) => {
    const filter = { topic: 'purpose', condition, query: COMMUNICATION_PURPOSES };
    const parameter = condition === 'is' ? 'purpose.in' : 'purpose.nin';
    const req = { query: { [parameter]: COMMUNICATION_PURPOSES } };
    const res = mockResponse();
    const next = jest.fn();

    checkRecipientTimelineQuery(req, res, next);

    expect(res.locals.recipientTimelineQuery.filters).toEqual([filter]);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['non-positive limit', { limit: '0' }],
    ['negative offset', { offset: '-1' }],
    ['unsupported sort field', { sortBy: 'title' }],
    ['unsupported direction', { direction: 'sideways' }],
    ['invalid checkbox', { excludeMultiRecipientCommunications: 'sometimes' }],
    ...[[], ['Unknown purpose'], [null], [42], ["General Check-In') OR TRUE --"]].map(
      (query) => ['invalid purpose selection', { 'purpose.in': query }]
    ),
    ['removed JSON filters parameter', { filters: '{"topic":"date"}' }],
    ['unsupported topic', { 'recipient.in': ['1'] }],
    ['unsupported condition', { 'purpose.ctn': ['General Check-In'] }],
    ['multiple date selections', { 'date.in': ['08/01/2026', '08/02/2026'] }],
    ['array supplied for a date range', { 'date.win': ['08/01/2026', '08/02/2026'] }],
    ['empty event type selection', { 'eventType.in': [] }],
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
