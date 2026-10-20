import httpCodes from 'http-codes';
import { handleError } from '../../lib/apiErrorHandler';
import {
  closeSurveyDefinition,
  createSurveyDefinition,
  FeedbackSurveyDefinitionError,
  listSurveyDefinitions,
  reopenSurveyDefinition,
} from '../../services/feedbackSurveyDefinitions';
import { closeDefinition, createDefinition, listDefinitions, reopenDefinition } from './feedbackSurveyDefinitions';

jest.mock('../../services/currentUser', () => ({
  currentUserId: jest.fn().mockResolvedValue(9),
}));

jest.mock('../../lib/apiErrorHandler', () => ({
  handleError: jest.fn(),
}));

jest.mock('../../services/feedbackSurveyDefinitions', () => {
  const actual = jest.requireActual('../../services/feedbackSurveyDefinitions');
  return {
    FeedbackSurveyDefinitionError: actual.FeedbackSurveyDefinitionError,
    listSurveyDefinitions: jest.fn(),
    createSurveyDefinition: jest.fn(),
    closeSurveyDefinition: jest.fn(),
    reopenSurveyDefinition: jest.fn(),
  };
});

describe('admin/feedback-survey-definitions', () => {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const res = { status } as never;

  const validCreateBody = {
    pageId: 'qa-dashboard',
    startDate: '2026-10-20',
    endDate: '2026-11-20',
    question: '  Was this helpful?  ',
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('lists surveys', async () => {
    const payload = { active: [], closed: [], pages: {} };
    (listSurveyDefinitions as jest.Mock).mockResolvedValue(payload);

    await listDefinitions({} as never, res);

    expect(status).toHaveBeenCalledWith(httpCodes.OK);
    expect(json).toHaveBeenCalledWith(payload);
  });

  it('creates a survey with a trimmed question for the session user', async () => {
    (createSurveyDefinition as jest.Mock).mockResolvedValue({ id: 1 });

    await createDefinition({ body: validCreateBody, session: { userId: 9 } } as never, res);

    expect(createSurveyDefinition).toHaveBeenCalledWith(
      { ...validCreateBody, question: 'Was this helpful?', manualClose: false },
      9
    );
    expect(status).toHaveBeenCalledWith(httpCodes.CREATED);
  });

  it.each([
    ['an unknown page', { pageId: 'nope' }],
    ['no question', { question: undefined }],
    ['a blank question', { question: '  ' }],
    ['a list of questions', { question: ['A?', 'B?'] }],
    ['a malformed date', { startDate: '10/20/2026' }],
    ['an unknown field', { status: 'closed' }],
    ['manualClose with dates', { manualClose: true }],
  ])('rejects a create body with %s', async (_label, override) => {
    await createDefinition({ body: { ...validCreateBody, ...override }, session: { userId: 9 } } as never, res);

    expect(createSurveyDefinition).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(httpCodes.BAD_REQUEST);
  });

  it('creates a manually closed survey without dates', async () => {
    (createSurveyDefinition as jest.Mock).mockResolvedValue({ id: 1 });

    await createDefinition(
      { body: { pageId: 'qa-dashboard', question: 'Q?', manualClose: true }, session: { userId: 9 } } as never,
      res
    );

    expect(createSurveyDefinition).toHaveBeenCalledWith({ pageId: 'qa-dashboard', question: 'Q?', manualClose: true }, 9);
    expect(status).toHaveBeenCalledWith(httpCodes.CREATED);
  });

  it('returns 400 with the service message on an overlap', async () => {
    (createSurveyDefinition as jest.Mock).mockRejectedValue(
      new FeedbackSurveyDefinitionError('QA dashboard already has an active survey')
    );

    await createDefinition({ body: validCreateBody, session: { userId: 9 } } as never, res);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ error: 'QA dashboard already has an active survey' });
  });

  it('closes a survey', async () => {
    (closeSurveyDefinition as jest.Mock).mockResolvedValue({ id: 4, status: 'closed' });

    await closeDefinition({ params: { surveyId: '4' } } as never, res);

    expect(closeSurveyDefinition).toHaveBeenCalledWith(4);
    expect(status).toHaveBeenCalledWith(httpCodes.OK);
  });

  it('rejects an invalid survey id', async () => {
    await closeDefinition({ params: { surveyId: 'abc' } } as never, res);

    expect(closeSurveyDefinition).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(httpCodes.BAD_REQUEST);
  });

  it('returns 404 when closing a missing survey', async () => {
    (closeSurveyDefinition as jest.Mock).mockRejectedValue(new FeedbackSurveyDefinitionError('Survey not found', 404));

    await closeDefinition({ params: { surveyId: '4' } } as never, res);

    expect(status).toHaveBeenCalledWith(404);
  });

  it('reopens a survey with new dates', async () => {
    (reopenSurveyDefinition as jest.Mock).mockResolvedValue({ id: 4, status: 'active' });
    const dates = { startDate: '2026-10-21', endDate: '2026-10-31' };

    await reopenDefinition({ params: { surveyId: '4' }, body: dates } as never, res);

    expect(reopenSurveyDefinition).toHaveBeenCalledWith(4, { ...dates, manualClose: false });
    expect(status).toHaveBeenCalledWith(httpCodes.OK);
  });

  it('reopens a survey to close manually', async () => {
    (reopenSurveyDefinition as jest.Mock).mockResolvedValue({ id: 4, status: 'active' });

    await reopenDefinition({ params: { surveyId: '4' }, body: { manualClose: true } } as never, res);

    expect(reopenSurveyDefinition).toHaveBeenCalledWith(4, { manualClose: true });
    expect(status).toHaveBeenCalledWith(httpCodes.OK);
  });

  it('rejects a reopen without dates', async () => {
    await reopenDefinition({ params: { surveyId: '4' }, body: {} } as never, res);

    expect(reopenSurveyDefinition).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(httpCodes.BAD_REQUEST);
  });

  it('delegates unexpected errors to handleError', async () => {
    const error = new Error('boom');
    (listSurveyDefinitions as jest.Mock).mockRejectedValue(error);

    await listDefinitions({} as never, res);

    expect(handleError).toHaveBeenCalledWith({}, res, error, { namespace: 'ADMIN:FEEDBACK-SURVEY-DEFINITIONS' });
  });
});
