import express from 'express';
import {
  createGoals,
  changeGoalStatus,
  reopenGoal,
  retrieveGoalsByIds,
  deleteGoal,
  mergeGoalHandler,
  getSimilarGoalsForRecipient,
  getSimilarGoalsByText,
  getMissingDataForActivityReport,
} from './handlers';
import transactionWrapper from '../transactionWrapper';
import { checkRegionIdParam, checkRecipientIdParam } from '../../middleware/checkIdParamMiddleware';

const router = express.Router();
router.post('/', transactionWrapper(createGoals));
router.get('/', transactionWrapper(retrieveGoalsByIds));
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

router.get(
  '/region/:regionId/incomplete',
  checkRegionIdParam,
  transactionWrapper(getMissingDataForActivityReport),
);

router.put('/reopen', transactionWrapper(reopenGoal));

export default router;
