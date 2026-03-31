import join from 'url-join';
import fetchMock from 'fetch-mock';

import { getSurveyFeedbackStatus, submitSurveyFeedback } from '../feedback';

const FORCE_SURVEY_SUBMIT_500_KEY = 'ttahub:forceSurveySubmit500';

describe('feedback fetchers', () => {
  afterEach(() => {
    fetchMock.restore();
    window.localStorage.removeItem(FORCE_SURVEY_SUBMIT_500_KEY);
  });

  describe('submitSurveyFeedback', () => {
    it('posts feedback to the survey endpoint', async () => {
      const payload = { success: true, feedbackId: 101 };
      fetchMock.post(join('/', 'api', 'feedback', 'survey'), payload);

      const response = await submitSurveyFeedback({ pageId: 'qa-dashboard', response: 'yes' });
      const data = await response.json();

      expect(data).toEqual(payload);
    });

    it('falls back to legacy /api/feedback endpoint when /survey is unavailable', async () => {
      const payload = { success: true, feedbackId: 202 };
      fetchMock.post(join('/', 'api', 'feedback', 'survey'), 404);
      fetchMock.post(join('/', 'api', 'feedback'), payload);

      const response = await submitSurveyFeedback({ pageId: 'qa-dashboard', response: 'yes' });
      const data = await response.json();

      expect(data).toEqual(payload);
    });

    it('throws a forced 500 when the local debug flag is set', async () => {
      window.localStorage.setItem(FORCE_SURVEY_SUBMIT_500_KEY, 'true');

      await expect(submitSurveyFeedback({ pageId: 'qa-dashboard', response: 'yes' }))
        .rejects
        .toMatchObject({ status: 500 });
    });
  });

  describe('getSurveyFeedbackStatus', () => {
    it('returns whether the user completed a page survey', async () => {
      fetchMock.get('/api/feedback/survey/completed?pageId=qa-dashboard', { completed: true });

      const completed = await getSurveyFeedbackStatus('qa-dashboard');

      expect(completed).toBe(true);
    });
  });
});
