import express from 'express';
import transactionWrapper from '../transactionWrapper';
import authMiddleware from '../../middleware/authMiddleware';
import { getGoalTemplates, getPrompts, getOptionsByPromptName } from './handlers';
import { checkGoalTemplateIdParam } from '../../middleware/checkIdParamMiddleware';

const router = express.Router();
router.get('/', authMiddleware, transactionWrapper(getGoalTemplates));
router.get('/:goalTemplateId/prompts/', authMiddleware, checkGoalTemplateIdParam, transactionWrapper(getPrompts));
router.get('/options', transactionWrapper(getOptionsByPromptName));
export default router;
