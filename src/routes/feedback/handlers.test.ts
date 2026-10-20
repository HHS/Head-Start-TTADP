import db from '../../models';
import saveFeedbackSurveyService, { markFeedbackSurveyCompleted } from '../../services/feedbackSurvey';
import { FeedbackSurveyDefinitionError, getActiveSurveyForPage } from '../../services/feedbackSurveyDefinitions';
import { getActiveSurvey, submitSurveyFeedback } from './handlers';
import { validateSubmitSurveyFeedbackBody } from './middleware';

jest.mock('../../services/feedbackSurvey');
jest.mock('../../services/feedbackSurveyDefinitions', () => {
  const actual = jest.requireActual('../../services/feedbackSurveyDefinitions');
  return {
    FeedbackSurveyDefinitionError: actual.FeedbackSurveyDefinitionError,
    getActiveSurveyForPage: jest.fn(),
  };
});

const saveFeedbackSurveyServiceMock = saveFeedbackSurveyService as jest.Mock;
const markFeedbackSurveyCompletedMock = markFeedbackSurveyCompleted as jest.Mock;
const getActiveSurveyForPageMock = getActiveSurveyForPage as jest.Mock;

describe('Feedback handlers', () => {
  const invokeSubmitSurveyFeedback = async (request: unknown, response: unknown) =>
    submitSurveyFeedback(request as never, response as never);
  const invokeGetActiveSurvey = async (request: unknown, response: unknown) =>
    getActiveSurvey(request as never, response as never);

  const mockResponse = () => {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    return { json, status, response: { status } };
  };

  const validBody = {
    surveyId: 3,
    responses: [
      { questionId: 10, response: 'yes', comment: 'Helpful' },
      { questionId: 11, response: 'no' },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe('submitSurveyFeedback', () => {
    it('returns 401 when user is not authenticated', async () => {
      const request = { body: validBody, session: {}, logger: { error: jest.fn() } };

      const { response, status, json } = mockResponse();
      await invokeSubmitSurveyFeedback(request, response);

      expect(status).toHaveBeenCalledWith(401);
      expect(json).toHaveBeenCalledWith({ error: 'User must be authenticated to submit feedback' });
      expect(saveFeedbackSurveyServiceMock).not.toHaveBeenCalled();
    });

    it('saves answers, marks the survey complete, and returns 201', async () => {
      saveFeedbackSurveyServiceMock.mockResolvedValue({
        survey: { id: 3, pageId: 'qa-dashboard' },
        feedback: [{ id: 100 }, { id: 101 }],
      });
      markFeedbackSurveyCompletedMock.mockResolvedValue({ id: 1 });

      const request = {
        body: { ...validBody, timestamp: '2026-03-12T12:30:00.000Z' },
        session: { userId: 7 },
      };

      const { response, status, json } = mockResponse();
      await invokeSubmitSurveyFeedback(request, response);

      expect(saveFeedbackSurveyServiceMock).toHaveBeenCalledWith({
        surveyId: 3,
        responses: validBody.responses,
        timestamp: '2026-03-12T12:30:00.000Z',
        userId: 7,
      });
      expect(markFeedbackSurveyCompletedMock).toHaveBeenCalledWith({
        surveyId: 3,
        pageId: 'qa-dashboard',
        userId: 7,
        timestamp: '2026-03-12T12:30:00.000Z',
      });
      expect(status).toHaveBeenCalledWith(201);
      expect(json).toHaveBeenCalledWith({ success: true, feedbackIds: [100, 101] });
    });

    it('returns 400 when the survey is not active', async () => {
      saveFeedbackSurveyServiceMock.mockRejectedValue(
        new FeedbackSurveyDefinitionError('Survey is not currently active')
      );

      const request = { body: validBody, session: { userId: 7 } };

      const { response, status, json } = mockResponse();
      await invokeSubmitSurveyFeedback(request, response);

      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith({ error: 'Survey is not currently active' });
      expect(markFeedbackSurveyCompletedMock).not.toHaveBeenCalled();
    });

    it('returns 500 and logs unexpected errors', async () => {
      saveFeedbackSurveyServiceMock.mockRejectedValue(new Error('db down'));
      const logger = { error: jest.fn() };

      const request = { body: validBody, session: { userId: 7 }, logger };

      const { response, status, json } = mockResponse();
      await invokeSubmitSurveyFeedback(request, response);

      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({ error: 'Failed to submit feedback' });
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getActiveSurvey', () => {
    it('returns 400 when pageId is missing', async () => {
      const request = { query: {}, session: { userId: 7 } };

      const { response, status } = mockResponse();
      await invokeGetActiveSurvey(request, response);

      expect(status).toHaveBeenCalledWith(400);
    });

    it('returns 401 when user is not authenticated', async () => {
      const request = { query: { pageId: 'qa-dashboard' }, session: {} };

      const { response, status } = mockResponse();
      await invokeGetActiveSurvey(request, response);

      expect(status).toHaveBeenCalledWith(401);
    });

    it('returns the active survey and completion status', async () => {
      const survey = { id: 3, pageId: 'qa-dashboard', questions: [{ id: 10, questionText: 'Q?', order: 1 }] };
      getActiveSurveyForPageMock.mockResolvedValue({ survey, completed: true });

      const request = { query: { pageId: 'qa-dashboard' }, session: { userId: 7 } };

      const { response, status, json } = mockResponse();
      await invokeGetActiveSurvey(request, response);

      expect(getActiveSurveyForPageMock).toHaveBeenCalledWith('qa-dashboard', 7);
      expect(status).toHaveBeenCalledWith(200);
      expect(json).toHaveBeenCalledWith({ pageId: 'qa-dashboard', survey, completed: true });
    });

    it('returns 500 on unexpected errors', async () => {
      getActiveSurveyForPageMock.mockRejectedValue(new Error('boom'));

      const request = { query: { pageId: 'qa-dashboard' }, session: { userId: 7 }, logger: { error: jest.fn() } };

      const { response, status } = mockResponse();
      await invokeGetActiveSurvey(request, response);

      expect(status).toHaveBeenCalledWith(500);
    });
  });

  describe('validateSubmitSurveyFeedbackBody', () => {
    const runValidation = (body: unknown) => {
      const { response, status, json } = mockResponse();
      const next = jest.fn();
      const request = { body };
      validateSubmitSurveyFeedbackBody(request as never, response as never, next);
      return { request, status, json, next };
    };

    it('passes valid bodies through with defaults applied', () => {
      const { request, next, status } = runValidation(validBody);

      expect(status).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
      expect((request.body as typeof validBody).responses[1]).toEqual({
        questionId: 11,
        response: 'no',
        comment: '',
      });
    });

    it('rejects a missing surveyId', () => {
      const { status, next } = runValidation({ responses: validBody.responses });

      expect(status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    it('rejects responses other than yes or no', () => {
      const { status, json } = runValidation({
        surveyId: 3,
        responses: [{ questionId: 10, response: 'maybe' }],
      });

      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith({ error: 'Response must be one of yes or no for yes/no surveys' });
    });

    it('rejects duplicate answers to the same question', () => {
      const { status } = runValidation({
        surveyId: 3,
        responses: [
          { questionId: 10, response: 'yes' },
          { questionId: 10, response: 'no' },
        ],
      });

      expect(status).toHaveBeenCalledWith(400);
    });

    it('rejects comments longer than 140 characters', () => {
      const { status } = runValidation({
        surveyId: 3,
        responses: [{ questionId: 10, response: 'yes', comment: 'x'.repeat(141) }],
      });

      expect(status).toHaveBeenCalledWith(400);
    });

    it('rejects invalid timestamps', () => {
      const { status, json } = runValidation({ ...validBody, timestamp: 'not-a-date' });

      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith({ error: 'Timestamp must be a valid ISO date string' });
    });
  });
});
