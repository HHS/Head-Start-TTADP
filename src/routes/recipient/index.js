import express from 'express';
import {
  getRecipient,
  searchRecipients,
  getGoalsByRecipient,
  getGoalsByIdandRecipient,
  getRecipientAndGrantsByUser,
  getRecipientLeadership,
} from './handlers';
import {
  checkRegionIdParam,
  checkRecipientIdParam,
} from '../../middleware/checkIdParamMiddleware';
import transactionWrapper from '../transactionWrapper';

const router = express.Router();
router.get('/search', transactionWrapper(searchRecipients));
router.get('/user', transactionWrapper(getRecipientAndGrantsByUser));
router.get(
  '/:recipientId',
  checkRecipientIdParam,
  transactionWrapper(getRecipient),
);
router.get(
  '/:recipientId/region/:regionId/goals',
  checkRecipientIdParam,
  checkRegionIdParam,
  transactionWrapper(getGoalsByRecipient),
);
router.get(
  '/:recipientId/goals',
  checkRecipientIdParam,
  transactionWrapper(getGoalsByIdandRecipient),
);
router.get(
  '/:recipientId/region/:regionId/leadership',
  checkRecipientIdParam,
  transactionWrapper(getRecipientLeadership),
);

export default router;
