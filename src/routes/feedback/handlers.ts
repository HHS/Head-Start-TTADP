import { Request, Response } from 'express';
import saveFeedbackSurveyService, {
  hasCompletedFeedbackSurvey,
  markFeedbackSurveyCompleted,
} from '../../services/feedbackSurvey';
import { auditLogger } from '../../logger';

type FeedbackBody = {
  pageId?: string;
  response?: 'yes' | 'no';
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
      response,
      comment,
      timestamp,
    } = reqData.body;
    const userId = reqData.session?.userId;

    if (!pageId) {
      return res.status(400).json({
        error: 'Missing required field: pageId is required',
      });
    }

    if (!response || !['yes', 'no'].includes(response)) {
      return res.status(400).json({
        error: 'Response must be one of yes or no for yes/no surveys',
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
      response,
      comment: comment || '',
      timestamp: timestamp || new Date().toISOString(),
      userId,
    });

    await markFeedbackSurveyCompleted({
      pageId,
      userId,
      timestamp: timestamp || new Date().toISOString(),
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

export async function getSurveyFeedbackStatus(req: Request, res: Response) {
  const reqData = req as Request & FeedbackRequestData & {
    query: {
      pageId?: string;
    };
  };

  try {
    const { pageId } = reqData.query;
    const userId = reqData.session?.userId;

    if (!pageId) {
      return res.status(400).json({
        error: 'Missing required query parameter: pageId is required',
      });
    }

    if (!userId) {
      return res.status(401).json({
        error: 'User must be authenticated to check survey status',
      });
    }

    const completed = await hasCompletedFeedbackSurvey({
      pageId,
      userId,
    });

    return res.status(200).json({
      pageId,
      completed,
    });
  } catch (error: unknown) {
    if (reqData && reqData.logger && typeof reqData.logger.error === 'function') {
      reqData.logger.error('Error checking survey feedback status:', error);
    } else {
      auditLogger.error('Error checking survey feedback status:', error);
    }
    return res.status(500).json({
      error: 'Failed to check survey feedback status',
    });
  }
}

export default submitSurveyFeedback;
