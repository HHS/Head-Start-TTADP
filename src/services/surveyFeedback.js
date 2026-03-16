import { SurveyFeedback } from '../models';
import { auditLogger } from '../logger';

/**
 * Save survey feedback.
 *
 * @param {Object} feedbackData - Feedback data
 * @param {string} feedbackData.pageId - Dashboard page identifier
 * @param {number} feedbackData.rating - User rating (1-10)
 * @param {string} feedbackData.comment - Optional user comment
 * @param {string} feedbackData.timestamp - ISO timestamp
 * @param {number} feedbackData.userId - User ID
 * @returns {Promise<Object>} Saved feedback object
 */
export async function saveSurveyFeedback(feedbackData) {
  const {
    pageId,
    rating,
    comment,
    timestamp,
    userId,
  } = feedbackData;

  const submittedAt = timestamp ? new Date(timestamp) : new Date();
  const normalizedComment = comment || '';

  const feedback = await SurveyFeedback.create({
    pageId,
    rating,
    comment: normalizedComment,
    submittedAt,
    userId,
  });

  // Log the feedback for analytics
  auditLogger.info('Survey feedback submitted', {
    pageId,
    rating,
    commentLength: normalizedComment.length,
    timestamp: submittedAt.toISOString(),
    userId,
    feedbackId: feedback.id,
  });

  return feedback;
}

export default saveSurveyFeedback;
