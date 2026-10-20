import moment from 'moment-timezone';
import { Op } from 'sequelize';
import db from '../models';
import { createUser } from '../testUtils';
import { getFeedbackSurveys, markFeedbackSurveyCompleted, saveFeedbackSurvey } from './feedbackSurvey';

const { FeedbackSurvey, FeedbackSurveyCompletion, FeedbackSurveyDefinition, FeedbackSurveyQuestion, User } = db;

const today = moment().tz('America/New_York');
const dateOnly = (m: moment.Moment) => m.format('YYYY-MM-DD');

describe('Survey feedback service', () => {
  const suffix = `${Date.now()}`;
  const pageId = `test-page-${suffix}`;
  const otherPageId = `test-other-page-${suffix}`;
  let user: { id: number; homeRegionId: number };
  let secondUser: { id: number; homeRegionId: number };
  let survey: { id: number; pageId: string };
  let otherSurvey: { id: number };
  let closedSurvey: { id: number };
  let questions: Array<{ id: number }>;
  let otherQuestion: { id: number };
  let closedQuestion: { id: number };

  const surveyIds = () => [survey.id, otherSurvey.id, closedSurvey.id];

  const answers = (first: 'yes' | 'no', second: 'yes' | 'no', comment = '') => [
    { questionId: questions[0].id, response: first, comment },
    { questionId: questions[1].id, response: second },
  ];

  beforeAll(async () => {
    [user, secondUser] = await Promise.all([
      createUser({ homeRegionId: 5 }),
      createUser({ homeRegionId: 7 }),
    ]);

    const window = {
      startDate: dateOnly(today.clone().subtract(1, 'day')),
      endDate: dateOnly(today.clone().add(1, 'day')),
    };

    [survey, otherSurvey, closedSurvey] = await Promise.all([
      FeedbackSurveyDefinition.create({ pageId, ...window, status: 'active' }),
      FeedbackSurveyDefinition.create({ pageId: otherPageId, ...window, status: 'active' }),
      FeedbackSurveyDefinition.create({ pageId, ...window, status: 'closed', closedAt: new Date() }),
    ]);

    questions = await FeedbackSurveyQuestion.bulkCreate([
      { surveyId: survey.id, questionText: 'First question?', order: 1 },
      { surveyId: survey.id, questionText: 'Second question?', order: 2 },
    ]);
    [otherQuestion, closedQuestion] = await Promise.all([
      FeedbackSurveyQuestion.create({ surveyId: otherSurvey.id, questionText: 'Other?', order: 1 }),
      FeedbackSurveyQuestion.create({ surveyId: closedSurvey.id, questionText: 'Closed?', order: 1 }),
    ]);
  });

  afterEach(async () => {
    await Promise.all([
      FeedbackSurvey.destroy({ where: { surveyId: surveyIds() } }),
      FeedbackSurveyCompletion.destroy({ where: { surveyId: surveyIds() } }),
    ]);
  });

  afterAll(async () => {
    await FeedbackSurveyQuestion.destroy({ where: { surveyId: surveyIds() } });
    await FeedbackSurveyDefinition.destroy({ where: { id: surveyIds() } });
    await User.destroy({ where: { id: [user.id, secondUser.id] } });
    await db.sequelize.close();
  });

  it('persists one row per answered question', async () => {
    const { feedback } = await saveFeedbackSurvey({
      surveyId: survey.id,
      responses: answers('yes', 'no', 'Useful content'),
      timestamp: '2026-03-12T12:30:00.000Z',
      userId: user.id,
    });

    expect(feedback).toHaveLength(2);

    const stored = await FeedbackSurvey.findAll({
      where: { id: feedback.map((f) => f.id) },
      order: [['questionId', 'ASC']],
    });

    expect(stored.map((s) => s.questionId)).toEqual(questions.map((q) => q.id));
    expect(stored.map((s) => s.response)).toEqual(['yes', 'no']);
    expect(stored.map((s) => s.comment)).toEqual(['Useful content', '']);
    stored.forEach((s) => {
      expect(s.pageId).toBe(pageId);
      expect(s.surveyId).toBe(survey.id);
      expect(s.regionId).toBe(user.homeRegionId);
      expect(s.userRoles).toEqual([]);
      expect(s.submittedAt.toISOString()).toBe('2026-03-12T12:30:00.000Z');
    });
  });

  it('defaults submittedAt to now when missing', async () => {
    const before = Date.now();

    const { feedback } = await saveFeedbackSurvey({
      surveyId: survey.id,
      responses: answers('yes', 'yes'),
      userId: user.id,
    });

    expect(new Date(feedback[0].submittedAt).getTime()).toBeGreaterThanOrEqual(before);
  });

  it('rejects submissions for closed surveys', async () => {
    await expect(
      saveFeedbackSurvey({
        surveyId: closedSurvey.id,
        responses: [{ questionId: closedQuestion.id, response: 'yes' }],
        userId: user.id,
      })
    ).rejects.toThrow('Survey is not currently active');
  });

  it('rejects submissions that skip a question or answer another survey', async () => {
    await expect(
      saveFeedbackSurvey({
        surveyId: survey.id,
        responses: [{ questionId: questions[0].id, response: 'yes' }],
        userId: user.id,
      })
    ).rejects.toThrow('Every survey question must be answered exactly once');

    await expect(
      saveFeedbackSurvey({
        surveyId: survey.id,
        responses: [
          { questionId: questions[0].id, response: 'yes' },
          { questionId: otherQuestion.id, response: 'yes' },
        ],
        userId: user.id,
      })
    ).rejects.toThrow('Every survey question must be answered exactly once');
  });

  it('retrieves and filters feedback by survey, response, and text', async () => {
    await saveFeedbackSurvey({
      surveyId: survey.id,
      responses: answers('yes', 'no', 'Great page'),
      userId: user.id,
    });
    await saveFeedbackSurvey({
      surveyId: otherSurvey.id,
      responses: [{ questionId: otherQuestion.id, response: 'yes', comment: 'Great too' }],
      userId: secondUser.id,
    });

    const filtered = await getFeedbackSurveys({
      surveyId: survey.id,
      response: 'yes',
      q: 'Great',
    });

    expect(filtered.count).toBe(1);
    expect(filtered.rows[0].pageId).toBe(pageId);
    expect((filtered.rows[0].question as { questionText: string }).questionText).toBe('First question?');
  });

  it('sorts feedback by response', async () => {
    await saveFeedbackSurvey({
      surveyId: survey.id,
      responses: answers('no', 'yes'),
      userId: user.id,
    });

    const sorted = await getFeedbackSurveys({
      surveyId: survey.id,
      sortBy: 'response',
      sortDir: 'asc',
    });

    expect(sorted.rows.map((r) => r.response)).toEqual(['yes', 'no']);
  });

  it('filters feedback by createdAt date range', async () => {
    const { feedback } = await saveFeedbackSurvey({
      surveyId: survey.id,
      responses: answers('yes', 'no'),
      userId: user.id,
    });

    await FeedbackSurvey.update(
      { createdAt: new Date('2026-03-01T12:00:00.000Z') },
      { where: { id: feedback[0].id } }
    );
    await FeedbackSurvey.update(
      { createdAt: new Date('2026-03-20T12:00:00.000Z') },
      { where: { id: feedback[1].id } }
    );

    const filtered = await getFeedbackSurveys({
      surveyId: survey.id,
      createdAtFrom: '2026-03-15',
      createdAtTo: '2026-03-25',
    });

    expect(filtered.count).toBe(1);
    expect(filtered.rows[0].id).toBe(feedback[1].id);
  });

  it('filters feedback by regionId and userRole', async () => {
    await saveFeedbackSurvey({
      surveyId: survey.id,
      responses: answers('yes', 'yes'),
      userId: user.id,
      regionId: 4,
      userRoles: ['Grants Specialist'],
    });
    await saveFeedbackSurvey({
      surveyId: survey.id,
      responses: answers('no', 'no'),
      userId: secondUser.id,
      regionId: 4,
      userRoles: ['Program Specialist'],
    });

    const filtered = await getFeedbackSurveys({
      surveyId: survey.id,
      regionId: 4,
      userRole: 'Grants Specialist',
    });

    expect(filtered.count).toBe(2);
    filtered.rows.forEach((row) => {
      expect(row.userRoles).toEqual(['Grants Specialist']);
    });
  });

  it('marks completion once per user and survey', async () => {
    await markFeedbackSurveyCompleted({
      surveyId: survey.id,
      pageId,
      userId: user.id,
      timestamp: '2026-03-31T16:30:00.000Z',
    });
    await markFeedbackSurveyCompleted({ surveyId: survey.id, pageId, userId: user.id });

    const completions = await FeedbackSurveyCompletion.findAll({
      where: { surveyId: survey.id, userId: user.id },
    });

    expect(completions).toHaveLength(1);
    expect(completions[0].completedAt.toISOString()).toBe('2026-03-31T16:30:00.000Z');
  });

  it('tracks completion separately for surveys on the same page', async () => {
    await markFeedbackSurveyCompleted({ surveyId: survey.id, pageId, userId: user.id });
    await markFeedbackSurveyCompleted({ surveyId: closedSurvey.id, pageId, userId: user.id });

    const count = await FeedbackSurveyCompletion.count({
      where: { pageId, userId: user.id, surveyId: { [Op.in]: [survey.id, closedSurvey.id] } },
    });

    expect(count).toBe(2);
  });
});
