import express from 'express';
import {
  createGoals,
  changeGoalStatus,
  deleteGoal,
  retrieveGoalsByIds,
  retrieveGoalByIdAndRecipient,
} from './handlers';
import transactionWrapper from '../transactionWrapper';

const router = express.Router();
router.post('/', transactionWrapper(createGoals));
router.get('/', transactionWrapper(retrieveGoalsByIds));
router.get('/:goalId/recipient/:recipientId', transactionWrapper(retrieveGoalByIdAndRecipient));
router.delete('/:goalId', transactionWrapper(deleteGoal));
router.put('/changeStatus', transactionWrapper(changeGoalStatus));

export default router;
