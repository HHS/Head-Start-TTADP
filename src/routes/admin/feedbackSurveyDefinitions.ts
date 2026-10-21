import { DECIMAL_BASE } from '@ttahub/common';
import express, { type Request, type Response } from 'express';
import httpCodes from 'http-codes';
import { handleError } from '../../lib/apiErrorHandler';
import { createSurveyDefinitionSchema, surveyDateRangeSchema } from '../../models/schemas/feedbackSurvey';
import {
  closeSurveyDefinition,
  createSurveyDefinition,
  FeedbackSurveyDefinitionError,
  listSurveyDefinitions,
  reopenSurveyDefinition,
} from '../../services/feedbackSurveyDefinitions';
import { currentUserId } from '../../services/currentUser';
import transactionWrapper from '../transactionWrapper';

const namespace = 'ADMIN:FEEDBACK-SURVEY-DEFINITIONS';
const logContext = { namespace };

function parseSurveyId(req: Request) {
  const surveyId = parseInt(req.params.surveyId, DECIMAL_BASE);
  return Number.isInteger(surveyId) && surveyId > 0 ? surveyId : null;
}

async function respondWithError(req: Request, res: Response, err: unknown) {
  if (err instanceof FeedbackSurveyDefinitionError) {
    return res.status(err.status).json({ error: err.message });
  }
  return handleError(req, res, err as Error, logContext);
}

export async function listDefinitions(req: Request, res: Response) {
  try {
    const surveys = await listSurveyDefinitions();
    return res.status(httpCodes.OK).json(surveys);
  } catch (err) {
    return respondWithError(req, res, err);
  }
}

export async function createDefinition(req: Request, res: Response) {
  try {
    const { error, value } = createSurveyDefinitionSchema.validate(req.body, { allowUnknown: false });
    if (error) {
      return res.status(httpCodes.BAD_REQUEST).json({ error: error.message });
    }

    const userId = await currentUserId(req, res);
    const survey = await createSurveyDefinition(value, userId);
    return res.status(httpCodes.CREATED).json(survey);
  } catch (err) {
    return respondWithError(req, res, err);
  }
}

export async function closeDefinition(req: Request, res: Response) {
  try {
    const surveyId = parseSurveyId(req);
    if (!surveyId) {
      return res.status(httpCodes.BAD_REQUEST).json({ error: 'Invalid survey id' });
    }

    const survey = await closeSurveyDefinition(surveyId);
    return res.status(httpCodes.OK).json(survey);
  } catch (err) {
    return respondWithError(req, res, err);
  }
}

export async function reopenDefinition(req: Request, res: Response) {
  try {
    const surveyId = parseSurveyId(req);
    if (!surveyId) {
      return res.status(httpCodes.BAD_REQUEST).json({ error: 'Invalid survey id' });
    }

    const { error, value } = surveyDateRangeSchema.validate(req.body, { allowUnknown: false });
    if (error) {
      return res.status(httpCodes.BAD_REQUEST).json({ error: error.message });
    }

    const survey = await reopenSurveyDefinition(surveyId, value);
    return res.status(httpCodes.OK).json(survey);
  } catch (err) {
    return respondWithError(req, res, err);
  }
}

const router = express.Router();

router.get('/', transactionWrapper(listDefinitions));
router.post('/', transactionWrapper(createDefinition));
router.put('/:surveyId/close', transactionWrapper(closeDefinition));
router.put('/:surveyId/reopen', transactionWrapper(reopenDefinition));

export default router;
