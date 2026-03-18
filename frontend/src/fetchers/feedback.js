import join from 'url-join';
import { post } from './index';

const feedbackUrl = join('/', 'api', 'feedback');

// eslint-disable-next-line import/prefer-default-export
export async function submitSurveyFeedback(feedbackData) {
  const surveyUrl = join(feedbackUrl, 'survey');

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
