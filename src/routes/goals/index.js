import express from 'express';
import { changeGoalStatus } from './handlers';

const router = express.Router();
router.put('/:goalId/changeStatus', changeGoalStatus);
export default router;
