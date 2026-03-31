import db from '../../models';
import saveFeedbackSurveyService, {
  hasCompletedFeedbackSurvey,
  markFeedbackSurveyCompleted,
} from '../../services/feedbackSurvey';
import { getSurveyFeedbackStatus, submitSurveyFeedback } from './handlers';
import { validateSubmitSurveyFeedbackBody } from './middleware';

jest.mock('../../services/feedbackSurvey');

const saveFeedbackSurveyServiceMock = saveFeedbackSurveyService as jest.Mock;
const markFeedbackSurveyCompletedMock = markFeedbackSurveyCompleted as jest.Mock;
const hasCompletedFeedbackSurveyMock = hasCompletedFeedbackSurvey as jest.Mock;

describe('Feedback handlers', () => {
  const invokeSubmitSurveyFeedback = async (request: unknown, response: unknown) => (
    submitSurveyFeedback(request as never, response as never)
  );
  const invokeGetSurveyFeedbackStatus = async (request: unknown, response: unknown) => (
    getSurveyFeedbackStatus(request as never, response as never)
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

  it('returns 400 when pageId is missing', async () => {
    const request = {
      body: { comment: 'Missing page id' },
      session: { userId: 7 },
      logger: { error: jest.fn() },
    };

    const { response, status, json } = mockResponse();
    await invokeSubmitSurveyFeedback(request, response);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      error: 'Missing required field: pageId is required',
    });
  });

  it('returns 401 when user is not authenticated', async () => {
    const request = {
      body: { pageId: 'qa-dashboard', response: 'yes' },
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
        response: 'yes',
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
    markFeedbackSurveyCompletedMock.mockResolvedValue({ id: 222 });

    const request = {
      body: {
        pageId: 'qa-dashboard',
        response: 'yes',
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
      response: 'yes',
      comment: 'Great dashboard',
      timestamp: '2026-03-12T12:00:00.000Z',
      userId: 7,
    });
    expect(markFeedbackSurveyCompletedMock).toHaveBeenCalledWith({
      pageId: 'qa-dashboard',
      userId: 7,
      timestamp: '2026-03-12T12:00:00.000Z',
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
        response: 'yes',
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

  it('returns 400 when response is missing', async () => {
    const request = {
      body: { pageId: 'qa-dashboard', comment: 'Only comment provided' },
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

  it('allows a yes/no submission payload', async () => {
    saveFeedbackSurveyServiceMock.mockResolvedValue({ id: 789 });
    markFeedbackSurveyCompletedMock.mockResolvedValue({ id: 333 });

    const request = {
      body: { pageId: 'qa-dashboard', response: 'no', comment: 'Only comment provided' },
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
      response: 'no',
      comment: 'Only comment provided',
      timestamp: expect.any(String),
      userId: 7,
    });
    expect(localResponse.status).toHaveBeenCalledWith(201);
  });

  it('returns 400 when pageId is missing from status query', async () => {
    const request = {
      query: {},
      session: { userId: 7 },
      logger: { error: jest.fn() },
    };

    const { response, status, json } = mockResponse();
    await invokeGetSurveyFeedbackStatus(request, response);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      error: 'Missing required query parameter: pageId is required',
    });
  });

  it('returns completion status for the current user and page', async () => {
    hasCompletedFeedbackSurveyMock.mockResolvedValue(true);

    const request = {
      query: { pageId: 'qa-dashboard' },
      session: { userId: 7 },
      logger: { error: jest.fn() },
    };

    const { response, status, json } = mockResponse();
    await invokeGetSurveyFeedbackStatus(request, response);

    expect(hasCompletedFeedbackSurveyMock).toHaveBeenCalledWith({
      pageId: 'qa-dashboard',
      userId: 7,
    });
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      pageId: 'qa-dashboard',
      completed: true,
    });
  });

  describe('validateSubmitSurveyFeedbackBody', () => {
    const makeValidationResponse = () => {
      const json = jest.fn();
      const status = jest.fn(() => ({ json }));
      return { status, json, response: { status } };
    };

    it('rejects unknown fields', () => {
      const req: { body: Record<string, unknown> } = {
        body: {
          pageId: 'qa-dashboard',
          response: 'yes',
          thumbs: 'yes',
        },
      };
      const next = jest.fn();
      const { response, status, json } = makeValidationResponse();

      validateSubmitSurveyFeedbackBody(req as never, response as never, next);

      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith({
        error: '"thumbs" is not allowed',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('applies defaults and calls next for valid payload', () => {
      const req: { body: Record<string, unknown> } = {
        body: {
          pageId: 'qa-dashboard',
          response: 'yes',
        },
      };
      const next = jest.fn();
      const { response } = makeValidationResponse();

      validateSubmitSurveyFeedbackBody(req as never, response as never, next);

      expect(next).toHaveBeenCalled();
      expect(req.body.comment).toBe('');
      expect(req.body.pageId).toBe('qa-dashboard');
      expect(req.body.response).toBe('yes');
    });
  });
});
