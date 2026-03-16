import express from 'express';
import { submitSurveyFeedback } from './handlers';
import { nameTransactionByPath } from '../../middleware/newRelicMiddleware';
import transactionWrapper from '../transactionWrapper';

const router = express.Router();

router.post('/survey', nameTransactionByPath, transactionWrapper(submitSurveyFeedback));

export default router;
