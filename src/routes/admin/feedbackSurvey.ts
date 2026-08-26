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
  regionId?: string;
  userRole?: string;
  createdAtFrom?: string;
  createdAtTo?: string;
  sortBy?: SortBy;
  sortDir?: SortDir;
  limit?: string;
  offset?: string;
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
      regionId,
      userRole,
      createdAtFrom,
      createdAtTo,
      sortBy,
      sortDir,
      limit,
      offset,
    } = req.query as FeedbackSurveyQuery;

    const parsedLimit = Number(limit || 100);
    const parsedOffset = Number(offset || 0);

    if (Number.isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 1000) {
      return res.status(400).json({
        error: 'limit must be a number between 1 and 1000',
      });
    }

    if (Number.isNaN(parsedOffset) || parsedOffset < 0 || !Number.isInteger(parsedOffset)) {
      return res.status(400).json({
        error: 'offset must be a non-negative integer',
      });
    }

    if (!isValidDateFilter(createdAtFrom) || !isValidDateFilter(createdAtTo)) {
      return res.status(400).json({
        error: 'createdAtFrom and createdAtTo must be valid dates in YYYY-MM-DD format',
      });
    }

    let parsedRegionId: number | undefined;
    if (regionId !== undefined && regionId !== '') {
      parsedRegionId = Number(regionId);

      if (!Number.isInteger(parsedRegionId) || parsedRegionId < 1) {
        return res.status(400).json({
          error: 'regionId must be a positive integer',
        });
      }
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
      regionId: parsedRegionId,
      userRole,
      createdAtFrom,
      createdAtTo,
      sortBy,
      sortDir,
      limit: parsedLimit,
      offset: parsedOffset,
    });

    const normalizedResults = results.rows.map((row: unknown) => {
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

    return res.status(200).json({
      rows: normalizedResults,
      total: results.count,
    });
  } catch (err) {
    await handleError(req, res, err as Error, logContext);
    return undefined;
  }
}

const router = express.Router();

router.get('/', transactionWrapper(listFeedbackSurveys));

export default router;
