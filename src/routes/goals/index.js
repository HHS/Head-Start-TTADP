import express from 'express';
import {
  createGoals,
  changeGoalStatus,
  retrieveGoalsByIds,
  retrieveGoalByIdAndRecipient,
  deleteGoal,
  createObjectivesForGoals,
} from './handlers';
import transactionWrapper from '../transactionWrapper';

const router = express.Router();
router.post('/', transactionWrapper(createGoals));
router.get('/', transactionWrapper(retrieveGoalsByIds));
router.get('/:goalId/recipient/:recipientId', transactionWrapper(retrieveGoalByIdAndRecipient));
router.put('/changeStatus', transactionWrapper(changeGoalStatus));
router.delete('/', transactionWrapper(deleteGoal));
router.post('/objectives/new', transactionWrapper(createObjectivesForGoals));

export default router;
