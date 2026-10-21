import type { Request, Response } from 'express';
import { auditLogger } from '../../logger';
import saveFeedbackSurveyService, {
  markFeedbackSurveyCompleted,
  type SurveyAnswerInput,
} from '../../services/feedbackSurvey';
import { FeedbackSurveyDefinitionError, getActiveSurveyForPage } from '../../services/feedbackSurveyDefinitions';

type FeedbackBody = {
  surveyId?: number;
  responses?: SurveyAnswerInput[];
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

function logError(reqData: FeedbackRequestData, message: string, error: unknown) {
  if (reqData?.logger && typeof reqData.logger.error === 'function') {
    reqData.logger.error(message, error);
  } else {
    auditLogger.error(message, error);
  }
}

export async function submitSurveyFeedback(req: Request, res: Response) {
  const reqData = req as Request & FeedbackRequestData;

  try {
    const { surveyId, responses } = reqData.body;
    const userId = reqData.session?.userId;

    if (!userId) {
      return res.status(401).json({
        error: 'User must be authenticated to submit feedback',
      });
    }

    // Submission time is always set server-side so clients cannot skew survey analytics
    const submittedAt = new Date().toISOString();

    const { survey, feedback } = await saveFeedbackSurveyService({
      surveyId,
      responses,
      timestamp: submittedAt,
      userId,
    });

    await markFeedbackSurveyCompleted({
      surveyId: survey.id,
      pageId: survey.pageId,
      userId,
      timestamp: submittedAt,
    });

    return res.status(201).json({
      success: true,
      feedbackIds: feedback.map((f) => f.id),
    });
  } catch (error: unknown) {
    if (error instanceof FeedbackSurveyDefinitionError) {
      return res.status(error.status).json({ error: error.message });
    }

    logError(reqData, 'Error submitting survey feedback:', error);
    return res.status(500).json({
      error: 'Failed to submit feedback',
    });
  }
}

export async function getActiveSurvey(req: Request, res: Response) {
  const reqData = req as Request &
    FeedbackRequestData & {
      query: {
        pageId?: string;
      };
    };

  try {
    const { pageId } = reqData.query;
    const userId = reqData.session?.userId;

    if (!pageId || typeof pageId !== 'string') {
      return res.status(400).json({
        error: 'Missing required query parameter: pageId is required',
      });
    }

    if (!userId) {
      return res.status(401).json({
        error: 'User must be authenticated to check survey status',
      });
    }

    const { survey, completed } = await getActiveSurveyForPage(pageId, userId);

    return res.status(200).json({
      pageId,
      survey,
      completed,
    });
  } catch (error: unknown) {
    logError(reqData, 'Error fetching active survey:', error);
    return res.status(500).json({
      error: 'Failed to fetch active survey',
    });
  }
}

export default submitSurveyFeedback;
