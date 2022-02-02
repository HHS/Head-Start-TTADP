import express from 'express';
import {
  getRecipient,
  searchRecipients,
  getGoalsByRecipient,
  changeRecipientGoalStatus,
} from './handlers';

const router = express.Router();
router.get('/search', searchRecipients);
router.get('/:recipientId', getRecipient);
router.get('/goals/:recipientId', getGoalsByRecipient);
router.put('/goals/:goalId/changeStatus', changeRecipientGoalStatus);
export default router;
