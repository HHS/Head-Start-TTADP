import db from '../models';
import { saveFeedbackSurvey } from './feedbackSurvey';
import { createUser } from '../testUtils';

const { FeedbackSurvey } = db;

describe('Survey feedback service', () => {
  let user: { id: number };

  beforeAll(async () => {
    user = await createUser();
  });

  afterAll(async () => {
    await FeedbackSurvey.destroy({ where: { userId: user.id } });
    await db.sequelize.close();
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
});
