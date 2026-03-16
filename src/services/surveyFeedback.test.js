import db, { SurveyFeedback } from '../models';
import { saveSurveyFeedback } from './surveyFeedback';
import { createUser } from '../testUtils';

describe('Survey feedback service', () => {
  let user;

  beforeAll(async () => {
    user = await createUser();
  });

  afterAll(async () => {
    await SurveyFeedback.destroy({ where: { userId: user.id } });
    await db.sequelize.close();
  });

  it('persists survey feedback', async () => {
    const feedback = await saveSurveyFeedback({
      pageId: 'qa-dashboard',
      rating: 9,
      comment: 'Useful content',
      timestamp: '2026-03-12T12:30:00.000Z',
      userId: user.id,
    });

    expect(feedback).toBeDefined();

    const storedFeedback = await SurveyFeedback.findOne({
      where: { id: feedback.id },
    });

    expect(storedFeedback).toBeDefined();
    expect(storedFeedback.pageId).toBe('qa-dashboard');
    expect(storedFeedback.rating).toBe(9);
    expect(storedFeedback.comment).toBe('Useful content');
    expect(storedFeedback.userId).toBe(user.id);
    expect(storedFeedback.submittedAt.toISOString()).toBe('2026-03-12T12:30:00.000Z');
  });

  it('defaults comment to empty string and submittedAt to now when missing', async () => {
    const before = Date.now();

    const feedback = await saveSurveyFeedback({
      pageId: 'activity-reports-landing',
      rating: 6,
      userId: user.id,
    });

    const storedFeedback = await SurveyFeedback.findOne({
      where: { id: feedback.id },
    });

    expect(storedFeedback.comment).toBe('');
    expect(new Date(storedFeedback.submittedAt).getTime()).toBeGreaterThanOrEqual(before);
  });
});
