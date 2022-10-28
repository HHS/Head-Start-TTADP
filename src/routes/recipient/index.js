import express from 'express';
import {
  getRecipient,
  searchRecipients,
  getGoalsByRecipient,
  getGoalsByIdandRecipient,
} from './handlers';
import transactionWrapper from '../transactionWrapper';

const router = express.Router();
router.get('/search', transactionWrapper(searchRecipients));
router.get('/:recipientId', transactionWrapper(getRecipient));
router.get('/:recipientId/region/:regionId/goals', transactionWrapper(getGoalsByRecipient));
router.get('/:recipientId/goals', transactionWrapper(getGoalsByIdandRecipient));
export default router;
