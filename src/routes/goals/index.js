import express from 'express';
import {
  createGoals,
  changeGoalStatus,
  retrieveGoalsByIds,
  retrieveGoalByIdAndRecipient,
  deleteGoal,
  mergeGoalHandler,
  getSimilarGoalsForRecipient,
} from './handlers';
import transactionWrapper from '../transactionWrapper';
import { checkIdParam } from '../../middleware/checkIdParamMiddleware';

const router = express.Router();
router.post('/', transactionWrapper(createGoals));
router.get('/', transactionWrapper(retrieveGoalsByIds));
router.get('/:goalId/recipient/:recipientId', transactionWrapper(retrieveGoalByIdAndRecipient));
router.put('/changeStatus', transactionWrapper(changeGoalStatus));
router.post('/merge', transactionWrapper(mergeGoalHandler));
router.delete('/', transactionWrapper(deleteGoal));
router.get(
  '/similar/:recipientId',
  (req, res, next) => checkIdParam(req, res, next, 'recipientId'),
  transactionWrapper(getSimilarGoalsForRecipient),
);

export default router;
