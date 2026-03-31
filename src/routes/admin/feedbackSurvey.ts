import express, { Request, Response } from 'express';
import transactionWrapper from '../transactionWrapper';
import { handleError } from '../../lib/apiErrorHandler';
import { getFeedbackSurveys } from '../../services/feedbackSurvey';

const namespace = 'ADMIN:FEEDBACK_SURVEY';
const logContext = { namespace };

type SortBy = 'submittedAt' | 'createdAt' | 'pageId' | 'regionId' | 'response';
type SortDir = 'asc' | 'desc';

type FeedbackSurveyQuery = {
  pageId?: string;
  response?: 'yes' | 'no';
  q?: string;
  createdAtFrom?: string;
  createdAtTo?: string;
  sortBy?: SortBy;
  sortDir?: SortDir;
  limit?: string;
};

function isValidDateFilter(value?: string) {
  if (!value) {
    return true;
  }

  const validDatePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!validDatePattern.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime());
}

export async function listFeedbackSurveys(req: Request, res: Response) {
  try {
    const {
      pageId,
      response,
      q,
      createdAtFrom,
      createdAtTo,
      sortBy,
      sortDir,
      limit,
    } = req.query as FeedbackSurveyQuery;

    const parsedLimit = Number(limit || 200);

    if (Number.isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 1000) {
      return res.status(400).json({
        error: 'limit must be a number between 1 and 1000',
      });
    }

    if (!isValidDateFilter(createdAtFrom) || !isValidDateFilter(createdAtTo)) {
      return res.status(400).json({
        error: 'createdAtFrom and createdAtTo must be valid dates in YYYY-MM-DD format',
      });
    }

    if (createdAtFrom && createdAtTo && createdAtFrom > createdAtTo) {
      return res.status(400).json({
        error: 'createdAtFrom must be before or equal to createdAtTo',
      });
    }

    const results = await getFeedbackSurveys({
      pageId,
      response,
      q,
      createdAtFrom,
      createdAtTo,
      sortBy,
      sortDir,
      limit: parsedLimit,
    });

    const normalizedResults = results.map((row: unknown) => {
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
      };
    });

    return res.status(200).json(normalizedResults);
  } catch (err) {
    await handleError(req, res, err as Error, logContext);
    return undefined;
  }
}

const router = express.Router();

router.get('/', transactionWrapper(listFeedbackSurveys));

export default router;
