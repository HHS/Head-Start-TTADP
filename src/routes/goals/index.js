import express from 'express';
import {
  createGoals,
  changeGoalStatus,
  deleteGoal,
  retrieveGoal,
} from './handlers';
import transactionWrapper from '../transactionWrapper';

const router = express.Router();
router.post('/', transactionWrapper(createGoals));
router.get('/:goalId/recipient/:recipientId', transactionWrapper(retrieveGoal));
router.delete('/:goalId', transactionWrapper(deleteGoal));
router.put('/:goalId/changeStatus', transactionWrapper(changeGoalStatus));

export default router;
