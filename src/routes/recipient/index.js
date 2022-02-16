import express from 'express';
import {
  getRecipient,
  searchRecipients,
  getGoalsByRecipient,
} from './handlers';

const router = express.Router();
router.get('/search', searchRecipients);
router.get('/:recipientId', getRecipient);
router.get('/:recipientId/region/:regionId/goals', getGoalsByRecipient);
export default router;
