import { Request, Response } from 'express';
import saveFeedbackSurveyService from '../../services/feedbackSurvey';
import { auditLogger } from '../../logger';

type ThumbsValue = 'yes' | 'no' | null;

type FeedbackBody = {
  pageId?: string;
  rating?: number | string;
  thumbs?: ThumbsValue;
  comment?: string;
  timestamp?: string;
};

type FeedbackRequestData = {
  body: FeedbackBody;
  session?: {
    userId?: number;
  };
  logger?: {
    error?: (...args: unknown[]) => void;
  };
};

export async function submitSurveyFeedback(req: Request, res: Response) {
  const reqData = req as Request & FeedbackRequestData;

  try {
    const {
      pageId,
      rating,
      thumbs,
      comment,
      timestamp,
    } = reqData.body;
    const userId = reqData.session?.userId;

    if (!pageId || rating === undefined || rating === null) {
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

    if (!thumbs || !['yes', 'no'].includes(thumbs)) {
      return res.status(400).json({
        error: 'Response must be one of yes or no for yes/no surveys',
      });
    }

    const expectedRating = thumbs === 'yes' ? 10 : 1;
    if (numericRating !== expectedRating) {
      return res.status(400).json({
        error: 'Yes/no surveys must use rating 10 for yes and 1 for no',
      });
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
      thumbs,
      comment: comment || '',
      timestamp: timestamp || new Date().toISOString(),
      userId,
    });

    return res.status(201).json({
      success: true,
      feedbackId: feedback.id,
    });
  } catch (error: unknown) {
    if (reqData && reqData.logger && typeof reqData.logger.error === 'function') {
      reqData.logger.error('Error submitting survey feedback:', error);
    } else {
      auditLogger.error('Error submitting survey feedback:', error);
    }
    return res.status(500).json({
      error: 'Failed to submit feedback',
    });
  }
}

export default submitSurveyFeedback;
