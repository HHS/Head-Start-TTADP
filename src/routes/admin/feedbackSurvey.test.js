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
      pageId: 'qa-dashboard',
      surveyType: 'thumbs',
      rating: 10,
      thumbs: 'up',
    }];
    getFeedbackSurveys.mockResolvedValue(rows);

    const req = {
      query: {
        pageId: 'qa',
        surveyType: 'thumbs',
        thumbs: 'up',
        q: 'great',
        sortBy: 'rating',
        sortDir: 'asc',
        limit: '100',
      },
    };

    await listFeedbackSurveys(req, mockResponse);

    expect(getFeedbackSurveys).toHaveBeenCalledWith({
      pageId: 'qa',
      surveyType: 'thumbs',
      thumbs: 'up',
      q: 'great',
      sortBy: 'rating',
      sortDir: 'asc',
      limit: 100,
    });
    expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.OK);
    expect(json).toHaveBeenCalledWith([{
      id: 1,
      pageId: 'qa-dashboard',
      surveyType: 'thumbs',
      rating: null,
      thumbs: 'up',
    }]);
  });

  it('nulls thumbs for scale surveys', async () => {
    const rows = [{
      id: 2,
      pageId: 'activity-reports',
      surveyType: 'scale',
      rating: 8,
      thumbs: 'down',
    }];
    getFeedbackSurveys.mockResolvedValue(rows);

    await listFeedbackSurveys({ query: {} }, mockResponse);

    expect(json).toHaveBeenCalledWith([{
      id: 2,
      pageId: 'activity-reports',
      surveyType: 'scale',
      rating: 8,
      thumbs: null,
    }]);
  });

  it('defaults limit when omitted', async () => {
    getFeedbackSurveys.mockResolvedValue([]);

    const req = {
      query: {},
    };

    await listFeedbackSurveys(req, mockResponse);

    expect(getFeedbackSurveys).toHaveBeenCalledWith({
      pageId: undefined,
      surveyType: undefined,
      thumbs: undefined,
      q: undefined,
      sortBy: undefined,
      sortDir: undefined,
      limit: 200,
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
});
