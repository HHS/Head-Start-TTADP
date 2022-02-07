import express from 'express';
import {
  getRecipient,
  searchRecipients,
  getGoalsByRecipient,
} from './handlers';

const router = express.Router();
router.get('/search', searchRecipients);
router.get('/:recipientId', getRecipient);
router.get('/goals/:recipientId', getGoalsByRecipient);
export default router;
