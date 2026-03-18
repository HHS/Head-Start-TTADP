import db from '../../models';
import saveFeedbackSurveyService from '../../services/feedbackSurvey';
import { submitSurveyFeedback } from './handlers';

jest.mock('../../services/feedbackSurvey');

describe('Feedback handlers', () => {
  const mockResponse = () => {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    return { json, status, response: { status } };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  it('returns 400 when required fields are missing', async () => {
    const request = {
      body: { rating: 5 },
      session: { userId: 7 },
      logger: { error: jest.fn() },
    };

    const { response, status, json } = mockResponse();
    await submitSurveyFeedback(request, response);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      error: 'Missing required fields: pageId and rating are required',
    });
  });

  it('returns 400 when rating is out of range', async () => {
    const request = {
      body: { pageId: 'qa-dashboard', rating: 11 },
      session: { userId: 7 },
      logger: { error: jest.fn() },
    };

    const { response, status, json } = mockResponse();
    await submitSurveyFeedback(request, response);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ error: 'Rating must be between 1 and 10' });
  });

  it('returns 401 when user is not authenticated', async () => {
    const request = {
      body: { pageId: 'qa-dashboard', rating: 8 },
      session: {},
      logger: { error: jest.fn() },
    };

    const { response, status, json } = mockResponse();
    await submitSurveyFeedback(request, response);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({
      error: 'User must be authenticated to submit feedback',
    });
  });

  it('returns 400 when timestamp is invalid', async () => {
    const request = {
      body: {
        pageId: 'qa-dashboard',
        rating: 8,
        timestamp: 'not-a-date',
      },
      session: { userId: 7 },
      logger: { error: jest.fn() },
    };

    const { response, status, json } = mockResponse();
    await submitSurveyFeedback(request, response);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      error: 'Timestamp must be a valid ISO date string',
    });
  });

  it('returns 201 and feedback id on success', async () => {
    saveFeedbackSurveyService.mockResolvedValue({ id: 123 });

    const request = {
      body: {
        pageId: 'qa-dashboard',
        rating: 8,
        comment: 'Great dashboard',
        timestamp: '2026-03-12T12:00:00.000Z',
      },
      session: { userId: 7 },
      logger: { error: jest.fn() },
    };

    const localJson = jest.fn();
    const localResponse = {
      status: jest.fn(() => ({ json: localJson })),
    };

    await submitSurveyFeedback(request, localResponse);

    expect(saveFeedbackSurveyService).toHaveBeenCalledWith({
      pageId: 'qa-dashboard',
      rating: 8,
      surveyType: 'scale',
      thumbs: null,
      comment: 'Great dashboard',
      timestamp: '2026-03-12T12:00:00.000Z',
      userId: 7,
    });
    expect(localResponse.status).toHaveBeenCalledWith(201);
    expect(localJson).toHaveBeenCalledWith({
      success: true,
      feedbackId: 123,
    });
  });

  it('returns 500 when service throws', async () => {
    const error = new Error('DB down');
    saveFeedbackSurveyService.mockRejectedValue(error);

    const logger = { error: jest.fn() };
    const request = {
      body: {
        pageId: 'qa-dashboard',
        rating: 8,
      },
      session: { userId: 7 },
      logger,
    };

    const localJson = jest.fn();
    const localResponse = {
      status: jest.fn(() => ({ json: localJson })),
    };

    await submitSurveyFeedback(request, localResponse);

    expect(localResponse.status).toHaveBeenCalledWith(500);
    expect(localJson).toHaveBeenCalledWith({ error: 'Failed to submit feedback' });
    expect(logger.error).toHaveBeenCalled();
  });

  it('returns 400 when surveyType is invalid', async () => {
    const request = {
      body: { pageId: 'qa-dashboard', rating: 8, surveyType: 'emoji' },
      session: { userId: 7 },
      logger: { error: jest.fn() },
    };

    const { response, status, json } = mockResponse();
    await submitSurveyFeedback(request, response);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      error: 'Survey type must be one of scale or thumbs',
    });
  });

  it('returns 400 when thumbs survey is missing thumbs value', async () => {
    const request = {
      body: { pageId: 'qa-dashboard', rating: 10, surveyType: 'thumbs' },
      session: { userId: 7 },
      logger: { error: jest.fn() },
    };

    const { response, status, json } = mockResponse();
    await submitSurveyFeedback(request, response);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      error: 'Thumbs value must be one of up or down for thumbs surveys',
    });
  });

  it('returns 400 when thumbs survey rating does not match thumbs value', async () => {
    const request = {
      body: {
        pageId: 'qa-dashboard',
        rating: 10,
        surveyType: 'thumbs',
        thumbs: 'down',
      },
      session: { userId: 7 },
      logger: { error: jest.fn() },
    };

    const { response, status, json } = mockResponse();
    await submitSurveyFeedback(request, response);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      error: 'Thumbs surveys must use rating 10 for up and 1 for down',
    });
  });

  it('passes surveyType and thumbs for thumbs submissions', async () => {
    saveFeedbackSurveyService.mockResolvedValue({ id: 456 });

    const request = {
      body: {
        pageId: 'qa-dashboard',
        rating: 1,
        surveyType: 'thumbs',
        thumbs: 'down',
        comment: 'Needs work',
        timestamp: '2026-03-12T12:00:00.000Z',
      },
      session: { userId: 7 },
      logger: { error: jest.fn() },
    };

    const localJson = jest.fn();
    const localResponse = {
      status: jest.fn(() => ({ json: localJson })),
    };

    await submitSurveyFeedback(request, localResponse);

    expect(saveFeedbackSurveyService).toHaveBeenCalledWith({
      pageId: 'qa-dashboard',
      rating: 1,
      surveyType: 'thumbs',
      thumbs: 'down',
      comment: 'Needs work',
      timestamp: '2026-03-12T12:00:00.000Z',
      userId: 7,
    });
  });
});
