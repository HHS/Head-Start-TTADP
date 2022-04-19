import express from 'express';
import {
  getRecipient,
  searchRecipients,
  getGoalsByRecipient,
} from './handlers';
import transactionWrapper from '../transactionWrapper';

const router = express.Router();
router.get('/search', transactionWrapper(searchRecipients));
router.get('/:recipientId', transactionWrapper(getRecipient));
router.get('/:recipientId/region/:regionId/goals', transactionWrapper(getGoalsByRecipient));
export default router;
