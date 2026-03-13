import { saveDashboardFeedback } from '../../services/dashboardFeedback';

/**
 * Handler for submitting dashboard feedback
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export async function submitDashboardFeedback(req, res) {
  try {
    const { pageId, rating, comment, timestamp } = req.body;
    const userId = req.session.userId;

    if (!pageId || !rating) {
      return res.status(400).json({
        error: 'Missing required fields: pageId and rating are required',
      });
    }

    if (rating < 1 || rating > 10) {
      return res.status(400).json({
        error: 'Rating must be between 1 and 10',
      });
    }

    const feedback = await saveDashboardFeedback({
      pageId,
      rating,
      comment: comment || '',
      timestamp: timestamp || new Date().toISOString(),
      userId,
    });

    return res.status(201).json({
      success: true,
      feedbackId: feedback.id,
    });
  } catch (error) {
    req.logger.error('Error submitting dashboard feedback:', error);
    return res.status(500).json({
      error: 'Failed to submit feedback',
    });
  }
}

export default submitDashboardFeedback;
