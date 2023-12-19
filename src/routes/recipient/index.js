import express from 'express';
import {
  getRecipient,
  searchRecipients,
  getGoalsByRecipient,
  getGoalsByIdandRecipient,
  getRecipientAndGrantsByUser,
  getRecipientLeadership,
  getMergeGoalPermissions,
} from './handlers';
import transactionWrapper from '../transactionWrapper';

const router = express.Router();
router.get('/search', transactionWrapper(searchRecipients));
router.get('/user', transactionWrapper(getRecipientAndGrantsByUser));
router.get('/:recipientId', transactionWrapper(getRecipient));
router.get('/:recipientId/region/:regionId/goals', transactionWrapper(getGoalsByRecipient));
router.get('/:recipientId/region/:regionId/merge-permissions', transactionWrapper(getMergeGoalPermissions));
router.get('/:recipientId/goals', transactionWrapper(getGoalsByIdandRecipient));
router.get('/:recipientId/region/:regionId/leadership', transactionWrapper(getRecipientLeadership));

export default router;
