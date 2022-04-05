import express from 'express';
import { createGoals, changeGoalStatus, deleteGoal } from './handlers';

const router = express.Router();
router.post('/', createGoals);
router.delete('/:goalId', deleteGoal);
router.put('/:goalId/changeStatus', changeGoalStatus);

export default router;
