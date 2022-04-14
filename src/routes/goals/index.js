import express from 'express';
import {
  createGoals,
  changeGoalStatus,
  deleteGoal,
  retrieveGoal,
} from './handlers';

const router = express.Router();
router.post('/', createGoals);
router.get('/:goalId/recipient/:recipientId', retrieveGoal);
router.delete('/:goalId', deleteGoal);
router.put('/:goalId/changeStatus', changeGoalStatus);

export default router;
