import { auditLogger } from '../logger';

/**
 * Save dashboard feedback
 * For now, this logs the feedback. In the future, this can be extended
 * to store feedback in a database table via a migration.
 *
 * @param {Object} feedbackData - Feedback data
 * @param {string} feedbackData.pageId - Dashboard page identifier
 * @param {number} feedbackData.rating - User rating (1-10)
 * @param {string} feedbackData.comment - Optional user comment
 * @param {string} feedbackData.timestamp - ISO timestamp
 * @param {number} feedbackData.userId - User ID
 * @returns {Promise<Object>} Saved feedback object
 */
export async function saveDashboardFeedback(feedbackData) {
  const {
    pageId,
    rating,
    comment,
    timestamp,
    userId,
  } = feedbackData;

  // Log the feedback for analytics
  auditLogger.info('Dashboard feedback submitted', {
    pageId,
    rating,
    commentLength: comment.length,
    timestamp,
    userId,
  });

  // Return a mock response with an ID
  // When database table is added, this will use Sequelize model to persist
  return {
    id: Date.now(), // Temporary ID generation
    pageId,
    rating,
    comment,
    timestamp,
    userId,
  };
}

export default saveDashboardFeedback;
