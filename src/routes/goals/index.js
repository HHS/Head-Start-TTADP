import express from 'express';
import {
  checkGoalTemplateIdParam,
  checkRegionIdParam,
} from '../../middleware/checkIdParamMiddleware';
import transactionWrapper from '../transactionWrapper';
import {
  changeGoalStatus,
  createGoals,
  createGoalsFromTemplate,
  deleteGoal,
  getGoalHistory,
  getMissingDataForActivityReport,
  reopenGoal,
  retrieveObjectiveOptionsByGoalTemplate,
} from './handlers';

const router = express.Router();
router.post('/', transactionWrapper(createGoals));
router.post(
  '/template/:goalTemplateId',
  checkGoalTemplateIdParam,
  transactionWrapper(createGoalsFromTemplate)
);
router.get('/', transactionWrapper(retrieveObjectiveOptionsByGoalTemplate));
router.put('/changeStatus', transactionWrapper(changeGoalStatus));
router.delete('/', transactionWrapper(deleteGoal));

router.get(
  '/region/:regionId/incomplete',
  checkRegionIdParam,
  transactionWrapper(getMissingDataForActivityReport)
);

router.put('/reopen', transactionWrapper(reopenGoal));

router.get('/:goalId/history', transactionWrapper(getGoalHistory));

export default router;
