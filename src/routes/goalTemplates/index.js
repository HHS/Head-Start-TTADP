import express from 'express';
import transactionWrapper from '../transactionWrapper';
import authMiddleware from '../../middleware/authMiddleware';
import {
  getGoalTemplates,
  getPrompts,
  getOptionsByPromptName,
  getSource,
  useStandardGoal,
} from './handlers';
import { checkGoalTemplateIdParam } from '../../middleware/checkIdParamMiddleware';

const router = express.Router();
router.get('/', authMiddleware, transactionWrapper(getGoalTemplates));

// TODO: (proposed) we won't need these once we fully release standard goals
router.get('/:goalTemplateId/prompts/', authMiddleware, checkGoalTemplateIdParam, transactionWrapper(getPrompts));
router.get('/:goalTemplateId/source/', authMiddleware, checkGoalTemplateIdParam, transactionWrapper(getSource));
router.get('/options', transactionWrapper(getOptionsByPromptName));

// Standard goal handlers
router.get('/:goalTemplateId/:grantId', transactionWrapper(useStandardGoal)); // TODO: add auth, middleware, check HTTP method

export default router;
