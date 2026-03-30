import db from '../models';
import { saveFeedbackSurvey, getFeedbackSurveys } from './feedbackSurvey';
import { createUser } from '../testUtils';

const { FeedbackSurvey } = db;

describe('Survey feedback service', () => {
  let user: { id: number; homeRegionId: number };
  let secondUser: { id: number; homeRegionId: number };

  beforeAll(async () => {
    user = await createUser({ homeRegionId: 5 });
    secondUser = await createUser({ homeRegionId: 7 });
  });

  afterAll(async () => {
    await FeedbackSurvey.destroy({ where: {} });
    await db.sequelize.close();
  });

  afterEach(async () => {
    await FeedbackSurvey.destroy({ where: {} });
  });

  it('persists survey feedback', async () => {
    const feedback = await saveFeedbackSurvey({
      pageId: 'qa-dashboard',
      rating: 10,
      thumbs: 'yes',
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
    expect(storedFeedback.rating).toBe(10);
    expect(storedFeedback.thumbs).toBe('yes');
    expect(storedFeedback.comment).toBe('Useful content');
    expect(storedFeedback.regionId).toBe(user.homeRegionId);
    expect(storedFeedback.userRoles).toEqual([]);
    expect(storedFeedback.submittedAt.toISOString()).toBe('2026-03-12T12:30:00.000Z');
  });

  it('defaults comment to empty string and submittedAt to now when missing', async () => {
    const before = Date.now();

    const feedback = await saveFeedbackSurvey({
      pageId: 'activity-reports-landing',
      rating: 10,
      thumbs: 'yes',
      userId: user.id,
    });

    const storedFeedback = await FeedbackSurvey.findOne({
      where: { id: feedback.id },
    });

    expect(storedFeedback.comment).toBe('');
    expect(storedFeedback.thumbs).toBe('yes');
    expect(storedFeedback.regionId).toBe(user.homeRegionId);
    expect(storedFeedback.userRoles).toEqual([]);
    expect(new Date(storedFeedback.submittedAt).getTime()).toBeGreaterThanOrEqual(before);
  });

  it('persists response metadata for feedback submissions', async () => {
    const feedback = await saveFeedbackSurvey({
      pageId: 'collaboration-reports-landing',
      rating: 1,
      thumbs: 'no',
      comment: 'This page is confusing',
      userId: user.id,
    });

    const storedFeedback = await FeedbackSurvey.findOne({ where: { id: feedback.id } });

    expect(storedFeedback.thumbs).toBe('no');
  });

  it('retrieves and filters feedback survey submissions', async () => {
    await saveFeedbackSurvey({
      pageId: 'qa-dashboard',
      rating: 10,
      thumbs: 'yes',
      comment: 'Great page',
      timestamp: '2026-03-12T12:30:00.000Z',
      userId: user.id,
    });

    await saveFeedbackSurvey({
      pageId: 'recipient-record',
      rating: 1,
      thumbs: 'no',
      comment: 'Needs work',
      timestamp: '2026-03-13T12:30:00.000Z',
      userId: secondUser.id,
    });

    const filtered = await getFeedbackSurveys({
      pageId: 'qa',
      thumbs: 'yes',
      q: 'Great',
      sortBy: 'submittedAt',
      sortDir: 'desc',
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].pageId).toBe('qa-dashboard');
    expect(filtered[0].thumbs).toBe('yes');
  });

  it('sorts feedback survey submissions by rating ascending', async () => {
    await saveFeedbackSurvey({
      pageId: 'page-a',
      rating: 10,
      thumbs: 'yes',
      comment: 'one',
      timestamp: '2026-03-12T12:30:00.000Z',
      userId: user.id,
    });

    await saveFeedbackSurvey({
      pageId: 'page-b',
      rating: 1,
      thumbs: 'no',
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
      rating: 10,
      thumbs: 'yes',
      comment: 'outside range',
      timestamp: '2026-03-01T12:00:00.000Z',
      userId: user.id,
    });

    const insideRange = await saveFeedbackSurvey({
      pageId: 'created-at-b',
      rating: 1,
      thumbs: 'no',
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
