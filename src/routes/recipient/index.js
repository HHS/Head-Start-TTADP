import express from 'express';
import { checkRecipientIdParam, checkRegionIdParam } from '../../middleware/checkIdParamMiddleware';
import transactionWrapper from '../transactionWrapper';
import {
  getGoalsByIdandRecipient,
  getGoalsByRecipient,
  getRecipient,
  getRecipientAndGrantsByUser,
  getRecipientLeadership,
  searchRecipients,
} from './handlers';

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

export default router;
