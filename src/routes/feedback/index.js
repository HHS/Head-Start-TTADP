import express from 'express';
import { submitDashboardFeedback } from './handlers';
import { nameTransactionByPath } from '../../middleware/newRelicMiddleware';
import transactionWrapper from '../transactionWrapper';

const router = express.Router();

router.post('/dashboard', nameTransactionByPath, transactionWrapper(submitDashboardFeedback));

export default router;
