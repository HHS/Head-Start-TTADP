import httpCodes from 'http-codes';
import { listFeedbackSurveys } from './feedbackSurvey';
import { getFeedbackSurveys } from '../../services/feedbackSurvey';

jest.mock('../../services/feedbackSurvey', () => ({
  getFeedbackSurveys: jest.fn(),
}));

describe('admin/feedback-surveys', () => {
  const json = jest.fn();
  const mockResponse = {
    json,
    status: jest.fn(() => ({
      json,
      end: jest.fn(),
    })),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns feedback survey rows', async () => {
    const rows = [{
      id: 1,
      regionId: 1,
      userRoles: ['Grants Specialist'],
      pageId: 'qa-dashboard',
      response: 'yes',
    }];
    getFeedbackSurveys.mockResolvedValue({ rows, count: 1 });

    const req = {
      query: {
        pageId: 'qa',
        response: 'yes',
        q: 'great',
        regionId: '4',
        userRole: 'Grants Specialist',
        createdAtFrom: '2026-03-01',
        createdAtTo: '2026-03-31',
        sortBy: 'pageId',
        sortDir: 'asc',
        limit: '100',
        offset: '0',
      },
    };

    await listFeedbackSurveys(req, mockResponse);

    expect(getFeedbackSurveys).toHaveBeenCalledWith({
      pageId: 'qa',
      response: 'yes',
      q: 'great',
      regionId: 4,
      userRole: 'Grants Specialist',
      createdAtFrom: '2026-03-01',
      createdAtTo: '2026-03-31',
      sortBy: 'pageId',
      sortDir: 'asc',
      limit: 100,
      offset: 0,
    });
    expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.OK);
    expect(json).toHaveBeenCalledWith({
      rows: [{
        id: 1,
        regionId: 1,
        userRoles: ['Grants Specialist'],
        pageId: 'qa-dashboard',
        response: 'yes',
      }],
      total: 1,
    });
  });

  it('returns feedback rows with yes_no response values', async () => {
    const rows = [{
      id: 2,
      regionId: 2,
      userRoles: ['Program Specialist'],
      pageId: 'activity-reports',
      response: 'no',
    }];
    getFeedbackSurveys.mockResolvedValue({ rows, count: 1 });

    await listFeedbackSurveys({ query: {} }, mockResponse);

    expect(json).toHaveBeenCalledWith({
      rows: [{
        id: 2,
        regionId: 2,
        userRoles: ['Program Specialist'],
        pageId: 'activity-reports',
        response: 'no',
      }],
      total: 1,
    });
  });

  it('defaults limit when omitted', async () => {
    getFeedbackSurveys.mockResolvedValue({ rows: [], count: 0 });

    const req = {
      query: {},
    };

    await listFeedbackSurveys(req, mockResponse);

    expect(getFeedbackSurveys).toHaveBeenCalledWith({
      pageId: undefined,
      response: undefined,
      q: undefined,
      regionId: undefined,
      userRole: undefined,
      createdAtFrom: undefined,
      createdAtTo: undefined,
      sortBy: undefined,
      sortDir: undefined,
      limit: 100,
      offset: 0,
    });
  });

  it('rejects invalid offsets', async () => {
    const req = {
      query: {
        offset: '-1',
      },
    };

    await listFeedbackSurveys(req, mockResponse);

    expect(getFeedbackSurveys).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith({
      error: 'offset must be a non-negative integer',
    });
  });

  it('rejects invalid limits', async () => {
    const req = {
      query: {
        limit: '5000',
      },
    };

    await listFeedbackSurveys(req, mockResponse);

    expect(getFeedbackSurveys).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.BAD_REQUEST);
  });

  it('rejects invalid createdAt filters', async () => {
    const req = {
      query: {
        createdAtFrom: '03/01/2026',
      },
    };

    await listFeedbackSurveys(req, mockResponse);

    expect(getFeedbackSurveys).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith({
      error: 'createdAtFrom and createdAtTo must be valid dates in YYYY-MM-DD format',
    });
  });

  it('rejects invalid regionId filters', async () => {
    const req = {
      query: {
        regionId: 'foo',
      },
    };

    await listFeedbackSurveys(req, mockResponse);

    expect(getFeedbackSurveys).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith({
      error: 'regionId must be a positive integer',
    });
  });

  it('rejects reversed createdAt filters', async () => {
    const req = {
      query: {
        createdAtFrom: '2026-03-31',
        createdAtTo: '2026-03-01',
      },
    };

    await listFeedbackSurveys(req, mockResponse);

    expect(getFeedbackSurveys).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith({
      error: 'createdAtFrom must be before or equal to createdAtTo',
    });
  });
});
