import express from 'express';
import { submitSurveyFeedback } from './handlers';
import { validateSubmitSurveyFeedbackBody } from './middleware';
import { nameTransactionByPath } from '../../middleware/newRelicMiddleware';
import transactionWrapper from '../transactionWrapper';

const router = express.Router();

router.post(
  '/survey',
  nameTransactionByPath,
  validateSubmitSurveyFeedbackBody,
  transactionWrapper(submitSurveyFeedback),
);

export default router;
