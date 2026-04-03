import express from 'express';
import {
  createGoals,
  changeGoalStatus,
  reopenGoal,
  retrieveObjectiveOptionsByGoalTemplate,
  deleteGoal,
  getMissingDataForActivityReport,
  createGoalsFromTemplate,
  getGoalHistory,
} from './handlers';
import { getGoalDashboardData } from './dashboardHandlers';
import { checkGoalDashboardQuery } from './middleware';
import transactionWrapper from '../transactionWrapper';
import { checkRegionIdParam, checkGoalTemplateIdParam } from '../../middleware/checkIdParamMiddleware';

const router = express.Router();
router.post('/', transactionWrapper(createGoals));
router.post(
  '/template/:goalTemplateId',
  checkGoalTemplateIdParam,
  transactionWrapper(createGoalsFromTemplate),
);
router.get('/', transactionWrapper(retrieveObjectiveOptionsByGoalTemplate));
router.put('/changeStatus', transactionWrapper(changeGoalStatus));
router.delete('/', transactionWrapper(deleteGoal));

router.get(
  '/region/:regionId/incomplete',
  checkRegionIdParam,
  transactionWrapper(getMissingDataForActivityReport),
);

router.get('/dashboard', checkGoalDashboardQuery, transactionWrapper(getGoalDashboardData));

router.put('/reopen', transactionWrapper(reopenGoal));

router.get('/:goalId/history', transactionWrapper(getGoalHistory));

export default router;
