import db from '../models';
import { saveFeedbackSurvey, getFeedbackSurveys } from './feedbackSurvey';
import { createUser } from '../testUtils';

const { FeedbackSurvey } = db.sequelize.models;

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
      response: 'yes',
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
    expect(storedFeedback.response).toBe('yes');
    expect(storedFeedback.comment).toBe('Useful content');
    expect(storedFeedback.regionId).toBe(user.homeRegionId);
    expect(storedFeedback.userRoles).toEqual([]);
    expect(storedFeedback.submittedAt.toISOString()).toBe('2026-03-12T12:30:00.000Z');
  });

  it('defaults comment to empty string and submittedAt to now when missing', async () => {
    const before = Date.now();

    const feedback = await saveFeedbackSurvey({
      pageId: 'activity-reports-landing',
      response: 'yes',
      userId: user.id,
    });

    const storedFeedback = await FeedbackSurvey.findOne({
      where: { id: feedback.id },
    });

    expect(storedFeedback.comment).toBe('');
    expect(storedFeedback.regionId).toBe(user.homeRegionId);
    expect(storedFeedback.userRoles).toEqual([]);
    expect(new Date(storedFeedback.submittedAt).getTime()).toBeGreaterThanOrEqual(before);
  });

  it('persists response metadata for feedback submissions', async () => {
    const feedback = await saveFeedbackSurvey({
      pageId: 'collaboration-reports-landing',
      response: 'no',
      comment: 'This page is confusing',
      userId: user.id,
    });

    const storedFeedback = await FeedbackSurvey.findOne({ where: { id: feedback.id } });

    expect(storedFeedback.response).toBe('no');
    expect(storedFeedback.comment).toBe('This page is confusing');
  });

  it('retrieves and filters feedback survey submissions', async () => {
    await saveFeedbackSurvey({
      pageId: 'qa-dashboard',
      response: 'yes',
      comment: 'Great page',
      timestamp: '2026-03-12T12:30:00.000Z',
      userId: user.id,
    });

    await saveFeedbackSurvey({
      pageId: 'recipient-record',
      response: 'no',
      comment: 'Needs work',
      timestamp: '2026-03-13T12:30:00.000Z',
      userId: secondUser.id,
    });

    const filtered = await getFeedbackSurveys({
      pageId: 'qa',
      response: 'yes',
      q: 'Great',
      sortBy: 'submittedAt',
      sortDir: 'desc',
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].pageId).toBe('qa-dashboard');
    expect(filtered[0].response).toBe('yes');
  });

  it('sorts feedback survey submissions by pageId ascending', async () => {
    await saveFeedbackSurvey({
      pageId: 'page-a',
      response: 'yes',
      comment: 'one',
      timestamp: '2026-03-12T12:30:00.000Z',
      userId: user.id,
    });

    await saveFeedbackSurvey({
      pageId: 'page-b',
      response: 'no',
      comment: 'two',
      timestamp: '2026-03-13T12:30:00.000Z',
      userId: secondUser.id,
    });

    const sorted = await getFeedbackSurveys({
      sortBy: 'pageId',
      sortDir: 'asc',
      limit: 10,
    });

    expect(sorted.length).toBeGreaterThanOrEqual(2);
    expect(sorted[0].pageId <= sorted[1].pageId).toBe(true);
  });

  it('filters feedback survey submissions by createdAt date range', async () => {
    const outsideRange = await saveFeedbackSurvey({
      pageId: 'created-at-a',
      response: 'yes',
      comment: 'outside range',
      timestamp: '2026-03-01T12:00:00.000Z',
      userId: user.id,
    });

    const insideRange = await saveFeedbackSurvey({
      pageId: 'created-at-b',
      response: 'no',
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
