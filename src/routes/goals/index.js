import express from 'express';
import {
  createGoals,
  changeGoalStatus,
  reopenGoal,
  retrieveGoalsByIds,
  deleteGoal,
  getMissingDataForActivityReport,
  createGoalsFromTemplate,
  getGoalHistory,
} from './handlers';
import transactionWrapper from '../transactionWrapper';
import { checkRegionIdParam, checkRecipientIdParam, checkGoalTemplateIdParam } from '../../middleware/checkIdParamMiddleware';

const router = express.Router();
router.post('/', transactionWrapper(createGoals));
router.post(
  '/template/:goalTemplateId',
  checkGoalTemplateIdParam,
  transactionWrapper(createGoalsFromTemplate),
);
router.get('/', transactionWrapper(retrieveGoalsByIds));
router.put('/changeStatus', transactionWrapper(changeGoalStatus));
router.delete('/', transactionWrapper(deleteGoal));

router.get(
  '/region/:regionId/incomplete',
  checkRegionIdParam,
  transactionWrapper(getMissingDataForActivityReport),
);

router.put('/reopen', transactionWrapper(reopenGoal));

router.get('/:goalId/history', transactionWrapper(getGoalHistory));

export default router;
