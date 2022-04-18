import express from 'express';
import {
  createGoals,
  changeGoalStatus,
  deleteGoal,
  retrieveGoalById,
  retrieveGoalByIdAndRecipient,
} from './handlers';

const router = express.Router();
router.post('/', createGoals);
router.get('/:goalId', retrieveGoalById);
router.get('/:goalId/recipient/:recipientId', retrieveGoalByIdAndRecipient);
router.delete('/:goalId', deleteGoal);
router.put('/:goalId/changeStatus', changeGoalStatus);

export default router;
