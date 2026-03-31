import join from 'url-join';
import fetchMock from 'fetch-mock';

import { getSurveyFeedbackStatus, submitSurveyFeedback } from '../feedback';

describe('feedback fetchers', () => {
  afterEach(() => fetchMock.restore());

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
  });

  describe('getSurveyFeedbackStatus', () => {
    it('returns whether the user completed a page survey', async () => {
      fetchMock.get('/api/feedback/survey/completed?pageId=qa-dashboard', { completed: true });

      const completed = await getSurveyFeedbackStatus('qa-dashboard');

      expect(completed).toBe(true);
    });
  });
});
