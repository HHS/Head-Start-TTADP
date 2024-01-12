import express from 'express';
import {
  getRecipient,
  searchRecipients,
  getGoalsByRecipient,
  getGoalsByIdandRecipient,
  getRecipientAndGrantsByUser,
  getRecipientLeadership,
  getMergeGoalPermissions,
  getGoalsFromRecipientGoalSimilarityGroup,
  markRecipientGoalGroupInvalid,
} from './handlers';
import {
  checkRegionIdParam,
  checkRecipientIdParam,
  checkGoalGroupIdParam,
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
  '/:recipientId/region/:regionId/merge-permissions',
  checkRecipientIdParam,
  checkRegionIdParam,
  transactionWrapper(getMergeGoalPermissions),
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
router.get(
  '/:recipientId/region/:regionId/group/:goalGroupId',
  checkRecipientIdParam,
  checkRegionIdParam,
  checkGoalGroupIdParam,
  transactionWrapper(getGoalsFromRecipientGoalSimilarityGroup),
);
router.put(
  '/:recipientId/region/:regionId/group/:goalGroupId/invalid',
  checkRecipientIdParam,
  checkRegionIdParam,
  checkGoalGroupIdParam,
  transactionWrapper(markRecipientGoalGroupInvalid),
);

export default router;
