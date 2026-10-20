import moment from 'moment-timezone';
import db from '../models';
import { createUser } from '../testUtils';
import {
  closeExpiredSurveyDefinitions,
  closeSurveyDefinition,
  createSurveyDefinition,
  getActiveSurveyForPage,
  listSurveyDefinitions,
  reopenSurveyDefinition,
} from './feedbackSurveyDefinitions';

const { FeedbackSurvey, FeedbackSurveyCompletion, FeedbackSurveyDefinition, FeedbackSurveyQuestion, User } = db;

const today = moment().tz('America/New_York');
const day = (offset: number) => today.clone().add(offset, 'days').format('YYYY-MM-DD');

// Real page ids are required by createSurveyDefinition; tests clear any rows they make on these pages
const PAGE = 'qa-dashboard';

describe('feedbackSurveyDefinitions service', () => {
  let user: { id: number };
  const createdIds: number[] = [];
  let existingIds: number[] = [];

  const track = <T extends { id: number }>(survey: T) => {
    createdIds.push(survey.id);
    return survey;
  };

  beforeAll(async () => {
    user = await createUser({});
    // Park any surveys already on the page (e.g. dev data) so overlap checks are deterministic
    const existing = await FeedbackSurveyDefinition.findAll({ where: { pageId: PAGE, status: 'active' } });
    existingIds = existing.map((s) => s.id);
    if (existingIds.length) {
      await FeedbackSurveyDefinition.update({ status: 'closed' }, { where: { id: existingIds } });
    }
  });

  afterEach(async () => {
    if (createdIds.length) {
      await FeedbackSurveyCompletion.destroy({ where: { surveyId: createdIds } });
      await FeedbackSurvey.destroy({ where: { surveyId: createdIds } });
      await FeedbackSurveyQuestion.destroy({ where: { surveyId: createdIds } });
      await FeedbackSurveyDefinition.destroy({ where: { id: createdIds } });
      createdIds.length = 0;
    }
  });

  afterAll(async () => {
    if (existingIds.length) {
      await FeedbackSurveyDefinition.update({ status: 'active' }, { where: { id: existingIds } });
    }
    await User.destroy({ where: { id: user.id } });
    await db.sequelize.close();
  });

  it('creates a survey with its question', async () => {
    const survey = track(
      await createSurveyDefinition({ pageId: PAGE, startDate: day(0), endDate: day(10), question: 'First?' }, user.id)
    );

    expect(survey.status).toBe('active');
    expect(survey.createdBy).toBe(user.id);
    expect(survey.questions.map((q) => [q.questionText, q.order])).toEqual([['First?', 1]]);
  });

  it('rejects unknown pages, past end dates, and inverted ranges', async () => {
    await expect(
      createSurveyDefinition({ pageId: 'nope', startDate: day(0), endDate: day(1), question: 'Q' }, user.id)
    ).rejects.toThrow('Unknown survey page');
    await expect(
      createSurveyDefinition({ pageId: PAGE, startDate: day(-5), endDate: day(-1), question: 'Q' }, user.id)
    ).rejects.toThrow('End date cannot be in the past');
    await expect(
      createSurveyDefinition({ pageId: PAGE, startDate: day(5), endDate: day(1), question: 'Q' }, user.id)
    ).rejects.toThrow('End date must be on or after start date');
  });

  it('rejects an overlapping active survey on the same page', async () => {
    track(
      await createSurveyDefinition({ pageId: PAGE, startDate: day(0), endDate: day(10), question: 'Q' }, user.id)
    );

    await expect(
      createSurveyDefinition({ pageId: PAGE, startDate: day(5), endDate: day(20), question: 'Q' }, user.id)
    ).rejects.toThrow('already has an active survey');

    // Back-to-back windows are fine
    track(
      await createSurveyDefinition({ pageId: PAGE, startDate: day(11), endDate: day(20), question: 'Q' }, user.id)
    );
  });

  it('closes and reopens a survey with new dates', async () => {
    const survey = track(
      await createSurveyDefinition({ pageId: PAGE, startDate: day(0), endDate: day(10), question: 'Q' }, user.id)
    );

    const closed = await closeSurveyDefinition(survey.id);
    expect(closed.status).toBe('closed');
    expect(closed.closedAt).not.toBeNull();
    await expect(closeSurveyDefinition(survey.id)).rejects.toThrow('already closed');

    const reopened = await reopenSurveyDefinition(survey.id, { startDate: day(2), endDate: day(30) });
    expect(reopened.status).toBe('active');
    expect(reopened.closedAt).toBeNull();
    expect(reopened.startDate).toBe(day(2));
    expect(reopened.endDate).toBe(day(30));
    await expect(reopenSurveyDefinition(survey.id, { startDate: day(2), endDate: day(30) })).rejects.toThrow(
      'already active'
    );
  });

  it('will not reopen into an overlap or a past end date', async () => {
    const first = track(
      await createSurveyDefinition({ pageId: PAGE, startDate: day(0), endDate: day(10), question: 'Q' }, user.id)
    );
    await closeSurveyDefinition(first.id);
    track(
      await createSurveyDefinition({ pageId: PAGE, startDate: day(0), endDate: day(10), question: 'Q' }, user.id)
    );

    await expect(reopenSurveyDefinition(first.id, { startDate: day(5), endDate: day(15) })).rejects.toThrow(
      'already has an active survey'
    );
    await expect(reopenSurveyDefinition(first.id, { startDate: day(-10), endDate: day(-1) })).rejects.toThrow(
      'End date cannot be in the past'
    );
  });

  it('lists active and closed surveys with response counts', async () => {
    const active = track(
      await createSurveyDefinition({ pageId: PAGE, startDate: day(0), endDate: day(10), question: 'A?' }, user.id)
    );
    const closed = track(
      await createSurveyDefinition({ pageId: PAGE, startDate: day(11), endDate: day(12), question: 'C?' }, user.id)
    );
    await closeSurveyDefinition(closed.id);

    // One submission = one row per question
    await FeedbackSurvey.bulkCreate(
      active.questions.map((q) => ({
        pageId: PAGE,
        surveyId: active.id,
        questionId: q.id,
        response: 'yes',
        submittedAt: new Date(),
      }))
    );

    const { active: activeRows, closed: closedRows, pages } = await listSurveyDefinitions();

    expect(pages[PAGE]).toBeDefined();
    const listedActive = activeRows.find((s) => s.id === active.id);
    expect(listedActive.responseCount).toBe(1);
    expect(listedActive.questions).toHaveLength(1);
    expect(closedRows.find((s) => s.id === closed.id)).toBeDefined();
    expect(activeRows.find((s) => s.id === closed.id)).toBeUndefined();
  });

  it('returns the survey showing on a page today and the user completion', async () => {
    const scheduled = track(
      await createSurveyDefinition({ pageId: PAGE, startDate: day(5), endDate: day(10), question: 'Later?' }, user.id)
    );
    expect((await getActiveSurveyForPage(PAGE, user.id)).survey).toBeNull();

    const current = track(
      await createSurveyDefinition({ pageId: PAGE, startDate: day(0), endDate: day(4), question: 'Now?' }, user.id)
    );

    let result = await getActiveSurveyForPage(PAGE, user.id);
    expect(result.survey.id).toBe(current.id);
    expect(result.survey.questions[0].questionText).toBe('Now?');
    expect(result.completed).toBe(false);

    await FeedbackSurveyCompletion.create({ surveyId: current.id, pageId: PAGE, userId: user.id, completedAt: new Date() });
    result = await getActiveSurveyForPage(PAGE, user.id);
    expect(result.completed).toBe(true);
    expect(scheduled.id).not.toBe(current.id);
  });

  it('creates a manually closed survey that opens today with no end date', async () => {
    const survey = track(await createSurveyDefinition({ pageId: PAGE, manualClose: true, question: 'Q' }, user.id));

    expect(survey.startDate).toBe(day(0));
    expect(survey.endDate).toBeNull();

    const result = await getActiveSurveyForPage(PAGE, user.id);
    expect(result.survey.id).toBe(survey.id);
  });

  it('treats a manually closed survey as overlapping every later window on the page', async () => {
    track(await createSurveyDefinition({ pageId: PAGE, manualClose: true, question: 'Q' }, user.id));

    await expect(
      createSurveyDefinition({ pageId: PAGE, startDate: day(100), endDate: day(110), question: 'Q' }, user.id)
    ).rejects.toThrow('already has an active survey from');
    await expect(createSurveyDefinition({ pageId: PAGE, manualClose: true, question: 'Q' }, user.id)).rejects.toThrow(
      'until it is closed'
    );
  });

  it('blocks a manually closed survey when a dated survey is still running', async () => {
    track(
      await createSurveyDefinition({ pageId: PAGE, startDate: day(0), endDate: day(10), question: 'Q' }, user.id)
    );

    await expect(createSurveyDefinition({ pageId: PAGE, manualClose: true, question: 'Q' }, user.id)).rejects.toThrow(
      'already has an active survey'
    );
  });

  it('requires dates unless the survey is closed manually', async () => {
    await expect(createSurveyDefinition({ pageId: PAGE, question: 'Q' }, user.id)).rejects.toThrow(
      'Start and end dates are required'
    );
  });

  it('reopens a survey to close manually', async () => {
    const survey = track(
      await createSurveyDefinition({ pageId: PAGE, startDate: day(0), endDate: day(10), question: 'Q' }, user.id)
    );
    await closeSurveyDefinition(survey.id);

    const reopened = await reopenSurveyDefinition(survey.id, { manualClose: true });

    expect(reopened.status).toBe('active');
    expect(reopened.startDate).toBe(day(0));
    expect(reopened.endDate).toBeNull();
  });

  it('closes only active surveys whose end date has passed', async () => {
    const [expired, endsToday, alreadyClosed, manual] = await Promise.all([
      FeedbackSurveyDefinition.create({ pageId: PAGE, startDate: day(-10), endDate: day(-1), status: 'active' }),
      FeedbackSurveyDefinition.create({ pageId: PAGE, startDate: day(-10), endDate: day(0), status: 'active' }),
      FeedbackSurveyDefinition.create({ pageId: PAGE, startDate: day(-10), endDate: day(-2), status: 'closed' }),
      FeedbackSurveyDefinition.create({ pageId: PAGE, startDate: day(-10), endDate: null, status: 'active' }),
    ]);
    [expired, endsToday, alreadyClosed, manual].forEach(track);

    const closedCount = await closeExpiredSurveyDefinitions();
    expect(closedCount).toBeGreaterThanOrEqual(1);

    await Promise.all([expired.reload(), endsToday.reload(), alreadyClosed.reload(), manual.reload()]);
    expect(expired.status).toBe('closed');
    expect(expired.closedAt).not.toBeNull();
    expect(endsToday.status).toBe('active');
    expect(alreadyClosed.closedAt).toBeNull();
    expect(manual.status).toBe('active');
  });
});
