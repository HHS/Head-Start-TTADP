import express from 'express';
import transactionWrapper from '../transactionWrapper';
import authMiddleware from '../../middleware/authMiddleware';
import { getGoalTemplates, getPrompts } from './handlers';

const router = express.Router();
router.get('/', authMiddleware, transactionWrapper(getGoalTemplates));
router.get('/prompts', authMiddleware, transactionWrapper(getPrompts));

export default router;
