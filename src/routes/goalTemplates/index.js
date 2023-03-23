import express from 'express';
import transactionWrapper from '../transactionWrapper';
import authMiddleware from '../../middleware/authMiddleware';
import { getGoalTemplates } from './handlers';

const router = express.Router();
router.get('/', authMiddleware, transactionWrapper(getGoalTemplates));

export default router;
