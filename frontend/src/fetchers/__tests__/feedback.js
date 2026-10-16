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

    it('does not force a 500 when localStorage is unavailable', async () => {
      const payload = { success: true, feedbackId: 303 };
      fetchMock.post(join('/', 'api', 'feedback', 'survey'), payload);
      const originalGetItem = Storage.prototype.getItem;
      const getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => {
        if (key === FORCE_SURVEY_SUBMIT_500_KEY) {
          throw new Error('blocked');
        }

        return originalGetItem.call(window.localStorage, key);
      });

      const response = await submitSurveyFeedback({ pageId: 'qa-dashboard', response: 'yes' });
      const data = await response.json();

      expect(data).toEqual(payload);

      getItemSpy.mockRestore();
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
