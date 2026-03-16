import join from 'url-join';
import { post } from './index';

const feedbackUrl = join('/', 'api', 'feedback');

// eslint-disable-next-line import/prefer-default-export
export async function submitSurveyFeedback(feedbackData) {
  const url = join(feedbackUrl, 'survey');
  return post(url, feedbackData);
}
