import express from 'express';
import { createGoals, changeGoalStatus } from './handlers';

const router = express.Router();
router.post('/', createGoals);
router.put('/:goalId/changeStatus', changeGoalStatus);
export default router;
