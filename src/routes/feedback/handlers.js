import saveFeedbackSurveyService from '../../services/feedbackSurvey';

const SURVEY_TYPES = ['scale', 'thumbs'];
const THUMBS_OPTIONS = ['up', 'down'];

/**
 * Handler for submitting survey feedback
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export async function submitSurveyFeedback(req, res) {
  try {
    const {
      pageId,
      rating,
      surveyType,
      thumbs,
      comment,
      timestamp,
    } = req.body;
    const userId = req.session?.userId;

    if (!pageId || !rating) {
      return res.status(400).json({
        error: 'Missing required fields: pageId and rating are required',
      });
    }

    const numericRating = Number(rating);

    if (Number.isNaN(numericRating)) {
      return res.status(400).json({
        error: 'Rating must be a valid number',
      });
    }

    if (numericRating < 1 || numericRating > 10) {
      return res.status(400).json({
        error: 'Rating must be between 1 and 10',
      });
    }

    const normalizedSurveyType = surveyType || 'scale';

    if (!SURVEY_TYPES.includes(normalizedSurveyType)) {
      return res.status(400).json({
        error: 'Survey type must be one of scale or thumbs',
      });
    }

    let normalizedThumbs = null;
    if (normalizedSurveyType === 'thumbs') {
      if (!thumbs || !THUMBS_OPTIONS.includes(thumbs)) {
        return res.status(400).json({
          error: 'Thumbs value must be one of up or down for thumbs surveys',
        });
      }

      normalizedThumbs = thumbs;
      const expectedRating = thumbs === 'up' ? 10 : 1;
      if (numericRating !== expectedRating) {
        return res.status(400).json({
          error: 'Thumbs surveys must use rating 10 for up and 1 for down',
        });
      }
    }

    if (!userId) {
      return res.status(401).json({
        error: 'User must be authenticated to submit feedback',
      });
    }

    if (timestamp && Number.isNaN(Date.parse(timestamp))) {
      return res.status(400).json({
        error: 'Timestamp must be a valid ISO date string',
      });
    }

    const feedback = await saveFeedbackSurveyService({
      pageId,
      rating: numericRating,
      surveyType: normalizedSurveyType,
      thumbs: normalizedThumbs,
      comment: comment || '',
      timestamp: timestamp || new Date().toISOString(),
      userId,
    });

    return res.status(201).json({
      success: true,
      feedbackId: feedback.id,
    });
  } catch (error) {
    if (req && req.logger && typeof req.logger.error === 'function') {
      req.logger.error('Error submitting survey feedback:', error);
    } else {
      console.error('Error submitting survey feedback:', error);
    }
    return res.status(500).json({
      error: 'Failed to submit feedback',
    });
  }
}

export default submitSurveyFeedback;
