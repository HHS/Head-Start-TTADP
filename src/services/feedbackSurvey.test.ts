import db from '../models';
import { saveFeedbackSurvey, getFeedbackSurveys } from './feedbackSurvey';
import { createUser } from '../testUtils';

const { FeedbackSurvey } = db;

describe('Survey feedback service', () => {
  let user: { id: number };
  let secondUser: { id: number };

  beforeAll(async () => {
    user = await createUser();
    secondUser = await createUser();
  });

  afterAll(async () => {
    await FeedbackSurvey.destroy({ where: { userId: [user.id, secondUser.id] } });
    await db.sequelize.close();
  });

  afterEach(async () => {
    await FeedbackSurvey.destroy({ where: { userId: [user.id, secondUser.id] } });
  });

  it('persists survey feedback', async () => {
    const feedback = await saveFeedbackSurvey({
      pageId: 'qa-dashboard',
      rating: 9,
      surveyType: 'scale',
      thumbs: null,
      comment: 'Useful content',
      timestamp: '2026-03-12T12:30:00.000Z',
      userId: user.id,
    });

    expect(feedback).toBeDefined();

    const storedFeedback = await FeedbackSurvey.findOne({
      where: { id: feedback.id },
    });

    expect(storedFeedback).toBeDefined();
    expect(storedFeedback.pageId).toBe('qa-dashboard');
    expect(storedFeedback.rating).toBe(9);
    expect(storedFeedback.surveyType).toBe('scale');
    expect(storedFeedback.thumbs).toBeNull();
    expect(storedFeedback.comment).toBe('Useful content');
    expect(storedFeedback.userId).toBe(user.id);
    expect(storedFeedback.submittedAt.toISOString()).toBe('2026-03-12T12:30:00.000Z');
  });

  it('defaults comment to empty string, surveyType to scale, and submittedAt to now when missing', async () => {
    const before = Date.now();

    const feedback = await saveFeedbackSurvey({
      pageId: 'activity-reports-landing',
      rating: 6,
      userId: user.id,
    });

    const storedFeedback = await FeedbackSurvey.findOne({
      where: { id: feedback.id },
    });

    expect(storedFeedback.comment).toBe('');
    expect(storedFeedback.surveyType).toBe('scale');
    expect(storedFeedback.thumbs).toBeNull();
    expect(new Date(storedFeedback.submittedAt).getTime()).toBeGreaterThanOrEqual(before);
  });

  it('persists thumbs metadata for thumbs surveys', async () => {
    const feedback = await saveFeedbackSurvey({
      pageId: 'collaboration-reports-landing',
      rating: 1,
      surveyType: 'thumbs',
      thumbs: 'down',
      comment: 'This page is confusing',
      userId: user.id,
    });

    const storedFeedback = await FeedbackSurvey.findOne({ where: { id: feedback.id } });

    expect(storedFeedback.surveyType).toBe('thumbs');
    expect(storedFeedback.thumbs).toBe('down');
  });

  it('retrieves and filters feedback survey submissions', async () => {
    await saveFeedbackSurvey({
      pageId: 'qa-dashboard',
      rating: 10,
      surveyType: 'thumbs',
      thumbs: 'up',
      comment: 'Great page',
      timestamp: '2026-03-12T12:30:00.000Z',
      userId: user.id,
    });

    await saveFeedbackSurvey({
      pageId: 'recipient-record',
      rating: 4,
      surveyType: 'scale',
      thumbs: null,
      comment: 'Needs work',
      timestamp: '2026-03-13T12:30:00.000Z',
      userId: secondUser.id,
    });

    const filtered = await getFeedbackSurveys({
      pageId: 'qa',
      surveyType: 'thumbs',
      thumbs: 'up',
      q: 'Great',
      sortBy: 'submittedAt',
      sortDir: 'desc',
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].pageId).toBe('qa-dashboard');
    expect(filtered[0].surveyType).toBe('thumbs');
    expect(filtered[0].thumbs).toBe('up');
  });

  it('sorts feedback survey submissions by rating ascending', async () => {
    await saveFeedbackSurvey({
      pageId: 'page-a',
      rating: 8,
      surveyType: 'scale',
      thumbs: null,
      comment: 'one',
      timestamp: '2026-03-12T12:30:00.000Z',
      userId: user.id,
    });

    await saveFeedbackSurvey({
      pageId: 'page-b',
      rating: 2,
      surveyType: 'scale',
      thumbs: null,
      comment: 'two',
      timestamp: '2026-03-13T12:30:00.000Z',
      userId: secondUser.id,
    });

    const sorted = await getFeedbackSurveys({
      sortBy: 'rating',
      sortDir: 'asc',
      limit: 10,
    });

    expect(sorted.length).toBeGreaterThanOrEqual(2);
    expect(sorted[0].rating).toBeLessThanOrEqual(sorted[1].rating);
  });

  it('filters feedback survey submissions by createdAt date range', async () => {
    const outsideRange = await saveFeedbackSurvey({
      pageId: 'created-at-a',
      rating: 5,
      surveyType: 'scale',
      thumbs: null,
      comment: 'outside range',
      timestamp: '2026-03-01T12:00:00.000Z',
      userId: user.id,
    });

    const insideRange = await saveFeedbackSurvey({
      pageId: 'created-at-b',
      rating: 9,
      surveyType: 'scale',
      thumbs: null,
      comment: 'inside range',
      timestamp: '2026-03-20T12:00:00.000Z',
      userId: secondUser.id,
    });

    await FeedbackSurvey.update(
      { createdAt: new Date('2026-03-01T12:00:00.000Z') },
      { where: { id: outsideRange.id } },
    );

    await FeedbackSurvey.update(
      { createdAt: new Date('2026-03-20T12:00:00.000Z') },
      { where: { id: insideRange.id } },
    );

    const filtered = await getFeedbackSurveys({
      pageId: 'created-at-',
      createdAtFrom: '2026-03-15',
      createdAtTo: '2026-03-25',
      sortBy: 'submittedAt',
      sortDir: 'asc',
      limit: 10,
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].pageId).toBe('created-at-b');
  });
});
