/* eslint-disable import/prefer-default-export */
import express, { Response, Request } from 'express';
import httpCodes from 'http-codes';
import transactionWrapper from '../transactionWrapper';
import { handleError } from '../../lib/apiErrorHandler';
import { getCuratedTemplates } from '../../services/goalTemplates';
import { createMultiRecipientGoalsFromAdmin } from '../../goalServices/goals';

const namespace = 'ADMIN:GROUPS';
const logContext = { namespace };

/**
   *
   * @param {Request} req - request
   * @param {Response} res - response
   */
export async function getCuratedGoalOptions(req: Request, res: Response) {
  // admin access is already checked in the middleware
  try {
    const templates = await getCuratedTemplates(null);
    res.status(httpCodes.OK).json(templates);
  } catch (err) {
    await handleError(req, res, err, logContext);
  }
}

/**
   *
   * @param {Request} req - request
   * @param {Response} res - response
   */
export async function createGoalsFromAdmin(req: Request, res: Response) {
  // admin access is already checked in the middleware
  try {
    const { body } = req;
    const data = await createMultiRecipientGoalsFromAdmin(body);
    res.status(httpCodes.OK).json(data);
  } catch (err) {
    await handleError(req, res, err, logContext);
  }
}

const router = express.Router();

router.get('/curated-templates', transactionWrapper(getCuratedGoalOptions));
router.post('/', transactionWrapper(createGoalsFromAdmin));

export default router;
