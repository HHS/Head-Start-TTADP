import join from 'url-join';
import { get, post } from './index';

const feedbackUrl = join('/', 'api', 'feedback');
const FORCE_SURVEY_SUBMIT_500_KEY = 'ttahub:forceSurveySubmit500';
const FORCE_SURVEY_SUBMIT_500_QUERY_PARAM = 'forceSurveySubmit500';

function shouldForceSurveySubmit500() {
  if (typeof window === 'undefined') {
    return false;
  }

  const queryParams = new URLSearchParams(window.location.search);
  const forceByQuery = queryParams.get(FORCE_SURVEY_SUBMIT_500_QUERY_PARAM) === 'true';
  const forceByStorage = window.localStorage.getItem(FORCE_SURVEY_SUBMIT_500_KEY) === 'true';

  return forceByQuery || forceByStorage;
}

function createForcedSurveySubmit500Error() {
  const error = new Error('Forced 500 error for feedback survey submit');
  error.status = 500;
  return error;
}

// eslint-disable-next-line import/prefer-default-export
export async function submitSurveyFeedback(feedbackData) {
  const surveyUrl = join(feedbackUrl, 'survey');

  if (shouldForceSurveySubmit500()) {
    throw createForcedSurveySubmit500Error();
  }

  try {
    return await post(surveyUrl, feedbackData);
  } catch (error) {
    // Backwards compatibility for environments that still expose POST /api/feedback.
    if (error && Number(error.status) === 404) {
      return post(feedbackUrl, feedbackData);
    }

    throw error;
  }
}

export async function getSurveyFeedbackStatus(pageId) {
  const statusUrl = `${join(feedbackUrl, 'survey', 'completed')}?pageId=${encodeURIComponent(pageId)}`;
  const response = await get(statusUrl);
  const payload = await response.json();

  return Boolean(payload.completed);
}
