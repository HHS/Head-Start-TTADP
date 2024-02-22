import express from 'express';
import {
  createGoals,
  changeGoalStatus,
  retrieveGoalsByIds,
  retrieveGoalByIdAndRecipient,
  deleteGoal,
  mergeGoalHandler,
  getSimilarGoalsForRecipient,
  getSimilarGoalsByText,
} from './handlers';
import transactionWrapper from '../transactionWrapper';
import { checkRegionIdParam, checkRecipientIdParam } from '../../middleware/checkIdParamMiddleware';

const router = express.Router();
router.post('/', transactionWrapper(createGoals));
router.get('/', transactionWrapper(retrieveGoalsByIds));
router.get('/:goalId/recipient/:recipientId', transactionWrapper(retrieveGoalByIdAndRecipient));
router.get(
  '/recipient/:recipientId/region/:regionId/nudge',
  checkRegionIdParam,
  checkRecipientIdParam,
  transactionWrapper(getSimilarGoalsByText),
);
router.put('/changeStatus', transactionWrapper(changeGoalStatus));
router.post(
  '/recipient/:recipientId/region/:regionId/merge',
  checkRegionIdParam,
  checkRecipientIdParam,
  transactionWrapper(mergeGoalHandler),
);
router.delete('/', transactionWrapper(deleteGoal));
router.get(
  '/similar/region/:regionId/recipient/:recipientId',
  checkRegionIdParam,
  checkRecipientIdParam,
  transactionWrapper(getSimilarGoalsForRecipient),
);

export default router;
