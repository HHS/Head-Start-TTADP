import express from 'express';
import { checkRecipientIdParam, checkRegionIdParam } from '../../middleware/checkIdParamMiddleware';
import transactionWrapper from '../transactionWrapper';
import {
  getGoalsByIdandRecipient,
  getGoalsByRecipient,
  getRecipient,
  getRecipientAndGrantsByUser,
  getRecipientLeadership,
  getRecipientTimeline,
  searchRecipients,
} from './handlers';
import { checkRecipientTimelineQuery } from './middleware';

const router = express.Router();
router.get('/search', transactionWrapper(searchRecipients));
router.get('/user', transactionWrapper(getRecipientAndGrantsByUser));
router.get('/:recipientId', checkRecipientIdParam, transactionWrapper(getRecipient));
router.get(
  '/:recipientId/region/:regionId/goals',
  checkRecipientIdParam,
  checkRegionIdParam,
  transactionWrapper(getGoalsByRecipient)
);
router.get(
  '/:recipientId/goals',
  checkRecipientIdParam,
  transactionWrapper(getGoalsByIdandRecipient)
);
router.get(
  '/:recipientId/region/:regionId/leadership',
  checkRecipientIdParam,
  transactionWrapper(getRecipientLeadership)
);
router.get(
  '/:recipientId/region/:regionId/timeline',
  checkRecipientIdParam,
  checkRegionIdParam,
  checkRecipientTimelineQuery,
  transactionWrapper(getRecipientTimeline)
);

export default router;
