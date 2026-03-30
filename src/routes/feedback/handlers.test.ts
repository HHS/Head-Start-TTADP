import db from '../../models';
import saveFeedbackSurveyService from '../../services/feedbackSurvey';
import { submitSurveyFeedback } from './handlers';
import { validateSubmitSurveyFeedbackBody } from './middleware';

jest.mock('../../services/feedbackSurvey');

const saveFeedbackSurveyServiceMock = saveFeedbackSurveyService as jest.Mock;

describe('Feedback handlers', () => {
  const invokeSubmitSurveyFeedback = async (request, response) => (
    submitSurveyFeedback(request as never, response as never)
  );

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
    await invokeSubmitSurveyFeedback(request, response);

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
    await invokeSubmitSurveyFeedback(request, response);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ error: 'Rating must be between 1 and 10' });
  });

  it('returns 401 when user is not authenticated', async () => {
    const request = {
      body: { pageId: 'qa-dashboard', rating: 10, thumbs: 'yes' },
      session: {},
      logger: { error: jest.fn() },
    };

    const { response, status, json } = mockResponse();
    await invokeSubmitSurveyFeedback(request, response);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({
      error: 'User must be authenticated to submit feedback',
    });
  });

  it('returns 400 when timestamp is invalid', async () => {
    const request = {
      body: {
        pageId: 'qa-dashboard',
        rating: 10,
        thumbs: 'yes',
        timestamp: 'not-a-date',
      },
      session: { userId: 7 },
      logger: { error: jest.fn() },
    };

    const { response, status, json } = mockResponse();
    await invokeSubmitSurveyFeedback(request, response);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      error: 'Timestamp must be a valid ISO date string',
    });
  });

  it('returns 201 and feedback id on success', async () => {
    saveFeedbackSurveyServiceMock.mockResolvedValue({ id: 123 });

    const request = {
      body: {
        pageId: 'qa-dashboard',
        rating: 10,
        thumbs: 'yes',
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

    await invokeSubmitSurveyFeedback(request, localResponse);

    expect(saveFeedbackSurveyServiceMock).toHaveBeenCalledWith({
      pageId: 'qa-dashboard',
      rating: 10,
      thumbs: 'yes',
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
    saveFeedbackSurveyServiceMock.mockRejectedValue(error);

    const logger = { error: jest.fn() };
    const request = {
      body: {
        pageId: 'qa-dashboard',
        rating: 10,
        thumbs: 'yes',
      },
      session: { userId: 7 },
      logger,
    };

    const localJson = jest.fn();
    const localResponse = {
      status: jest.fn(() => ({ json: localJson })),
    };

    await invokeSubmitSurveyFeedback(request, localResponse);

    expect(localResponse.status).toHaveBeenCalledWith(500);
    expect(localJson).toHaveBeenCalledWith({ error: 'Failed to submit feedback' });
    expect(logger.error).toHaveBeenCalled();
  });

  it('returns 400 when yes/no survey is missing yes/no value', async () => {
    const request = {
      body: { pageId: 'qa-dashboard', rating: 10 },
      session: { userId: 7 },
      logger: { error: jest.fn() },
    };

    const { response, status, json } = mockResponse();
    await invokeSubmitSurveyFeedback(request, response);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      error: 'Response must be one of yes or no for yes/no surveys',
    });
  });

  it('returns 400 when yes/no survey rating does not match selection', async () => {
    const request = {
      body: {
        pageId: 'qa-dashboard',
        rating: 10,
        thumbs: 'no',
      },
      session: { userId: 7 },
      logger: { error: jest.fn() },
    };

    const { response, status, json } = mockResponse();
    await invokeSubmitSurveyFeedback(request, response);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      error: 'Yes/no surveys must use rating 10 for yes and 1 for no',
    });
  });

  it('passes thumbs for yes/no submissions', async () => {
    saveFeedbackSurveyServiceMock.mockResolvedValue({ id: 456 });

    const request = {
      body: {
        pageId: 'qa-dashboard',
        rating: 1,
        thumbs: 'no',
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

    await invokeSubmitSurveyFeedback(request, localResponse);

    expect(saveFeedbackSurveyServiceMock).toHaveBeenCalledWith({
      pageId: 'qa-dashboard',
      rating: 1,
      thumbs: 'no',
      comment: 'Needs work',
      timestamp: '2026-03-12T12:00:00.000Z',
      userId: 7,
    });
  });

  describe('validateSubmitSurveyFeedbackBody', () => {
    const makeValidationResponse = () => {
      const json = jest.fn();
      const status = jest.fn(() => ({ json }));
      return { status, json, response: { status } };
    };

    it('returns 400 when rating for yes/no does not match selection', () => {
      const req: { body: Record<string, unknown> } = {
        body: {
          pageId: 'qa-dashboard',
          rating: 10,
          thumbs: 'no',
        },
      };
      const next = jest.fn();
      const { response, status, json } = makeValidationResponse();

      validateSubmitSurveyFeedbackBody(req as never, response as never, next);

      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith({
        error: 'Yes/no surveys must use rating 10 for yes and 1 for no',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('applies defaults and calls next for valid payload', () => {
      const req: { body: Record<string, unknown> } = {
        body: {
          pageId: 'qa-dashboard',
          rating: '10',
          thumbs: 'yes',
        },
      };
      const next = jest.fn();
      const { response } = makeValidationResponse();

      validateSubmitSurveyFeedbackBody(req as never, response as never, next);

      expect(next).toHaveBeenCalled();
      expect(req.body.comment).toBe('');
      expect(req.body.rating).toBe(10);
    });
  });
});
