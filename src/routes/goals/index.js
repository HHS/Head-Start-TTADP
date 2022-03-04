import express from 'express';
import { createGoal, changeGoalStatus } from './handlers';

const router = express.Router();
router.post('/', createGoal);
router.put('/:goalId/changeStatus', changeGoalStatus);
export default router;
