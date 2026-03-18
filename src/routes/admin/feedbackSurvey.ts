import express, { Request, Response } from 'express';
import httpCodes from 'http-codes';
import transactionWrapper from '../transactionWrapper';
import { handleError } from '../../lib/apiErrorHandler';
import { getFeedbackSurveys } from '../../services/feedbackSurvey';

const namespace = 'ADMIN:FEEDBACK_SURVEY';
const logContext = { namespace };

type SurveyType = 'scale' | 'thumbs';
type ThumbsValue = 'up' | 'down';
type SortBy = 'submittedAt' | 'rating' | 'pageId' | 'surveyType';
type SortDir = 'asc' | 'desc';

type FeedbackSurveyQuery = {
  pageId?: string;
  surveyType?: SurveyType;
  thumbs?: ThumbsValue;
  q?: string;
  sortBy?: SortBy;
  sortDir?: SortDir;
  limit?: string;
};

export async function listFeedbackSurveys(req: Request, res: Response) {
  try {
    const {
      pageId,
      surveyType,
      thumbs,
      q,
      sortBy,
      sortDir,
      limit,
    } = req.query as FeedbackSurveyQuery;

    const parsedLimit = Number(limit || 200);

    if (Number.isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 1000) {
      return res.status(httpCodes.BAD_REQUEST).json({
        error: 'limit must be a number between 1 and 1000',
      });
    }

    const results = await getFeedbackSurveys({
      pageId,
      surveyType,
      thumbs,
      q,
      sortBy,
      sortDir,
      limit: parsedLimit,
    });

    const normalizedResults = results.map((row) => {
      const plainRow = typeof (
        row as { get?: (args: { plain: boolean }) => unknown }
      ).get === 'function'
        ? (
          row as {
            get: (args: { plain: boolean }) => Record<string, unknown>;
          }
        ).get({ plain: true })
        : (row as Record<string, unknown>);

      return {
        ...plainRow,
        rating: plainRow.surveyType === 'scale' ? plainRow.rating : null,
        thumbs: plainRow.surveyType === 'thumbs' ? plainRow.thumbs : null,
      };
    });

    return res.status(httpCodes.OK).json(normalizedResults);
  } catch (err) {
    await handleError(req, res, err, logContext);
    return undefined;
  }
}

const router = express.Router();

router.get('/', transactionWrapper(listFeedbackSurveys));

export default router;
