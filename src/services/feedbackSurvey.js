import { FeedbackSurvey } from '../models';
import { auditLogger } from '../logger';

/**
 * Save survey feedback.
 *
 * @param {Object} feedbackData - Feedback data
 * @param {string} feedbackData.pageId - Dashboard page identifier
 * @param {number} feedbackData.rating - User rating (1-10)
 * @param {string} feedbackData.surveyType - Survey type: scale or thumbs
 * @param {string|null} feedbackData.thumbs - Thumbs selection for thumbs survey
 * @param {string} feedbackData.comment - Optional user comment
 * @param {string} feedbackData.timestamp - ISO timestamp
 * @param {number} feedbackData.userId - User ID
 * @returns {Promise<Object>} Saved feedback object
 */
export async function saveFeedbackSurvey(feedbackData) {
  const {
    pageId,
    rating,
    surveyType,
    thumbs,
    comment,
    timestamp,
    userId,
  } = feedbackData;

  const submittedAt = timestamp ? new Date(timestamp) : new Date();
  const normalizedComment = comment || '';
  const normalizedSurveyType = surveyType || 'scale';

  const feedback = await FeedbackSurvey.create({
    pageId,
    rating,
    surveyType: normalizedSurveyType,
    thumbs: normalizedSurveyType === 'thumbs' ? thumbs : null,
    comment: normalizedComment,
    submittedAt,
    userId,
  });

  // Log the feedback for analytics
  auditLogger.info('Survey feedback submitted', {
    pageId,
    rating,
    surveyType: normalizedSurveyType,
    thumbs: normalizedSurveyType === 'thumbs' ? thumbs : null,
    commentLength: normalizedComment.length,
    timestamp: submittedAt.toISOString(),
    userId,
    feedbackId: feedback.id,
  });

  return feedback;
}

export default saveFeedbackSurvey;
