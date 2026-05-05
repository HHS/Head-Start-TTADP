import express from 'express';
import authMiddleware from '../../middleware/authMiddleware';
import canWriteReportsInGrantRegionMiddleware from '../../middleware/canWriteReportsInGrantRegionMiddleware';
import canWriteReportsInRegionMiddleware from '../../middleware/canWriteReportsInRegionMiddleware';
import {
  checkGoalTemplateIdParam,
  checkGrantIdParam,
  checkRecipientIdParam,
  checkRegionIdParam,
} from '../../middleware/checkIdParamMiddleware';
import transactionWrapper from '../transactionWrapper';
import {
  getGoalTemplates,
  getOptionsByPromptName,
  getPrompts,
  getSource,
  getStandardGoal,
  getStandardGoalsByRecipientId,
  updateStandardGoal,
  useStandardGoal,
} from './handlers';

const router = express.Router();

router.get(
  '/:goalTemplateId/prompts/',
  authMiddleware,
  checkGoalTemplateIdParam,
  transactionWrapper(getPrompts)
);
router.get('/options', transactionWrapper(getOptionsByPromptName));

// TODO: proposal - we won't need this once we fully release standard goals
router.get(
  '/:goalTemplateId/source/',
  authMiddleware,
  checkGoalTemplateIdParam,
  transactionWrapper(getSource)
);

// Standard goal handlers
router.get(
  '/standard/:goalTemplateId/grant/:grantId',
  authMiddleware,
  checkGoalTemplateIdParam,
  checkGrantIdParam,
  canWriteReportsInGrantRegionMiddleware,
  transactionWrapper(getStandardGoal)
);
router.post(
  '/standard/:goalTemplateId/grant/:grantId',
  authMiddleware,
  checkGoalTemplateIdParam,
  checkGrantIdParam,
  canWriteReportsInGrantRegionMiddleware,
  transactionWrapper(useStandardGoal)
);
router.put(
  '/standard/:goalTemplateId/grant/:grantId',
  authMiddleware,
  checkGoalTemplateIdParam,
  checkGrantIdParam,
  canWriteReportsInGrantRegionMiddleware,
  transactionWrapper(updateStandardGoal)
);

// eslint-disable-next-line max-len
router.get(
  '/standard/recipient/:recipientId/region/regionId',
  authMiddleware,
  checkRecipientIdParam,
  checkRegionIdParam,
  canWriteReportsInRegionMiddleware,
  transactionWrapper(getStandardGoalsByRecipientId)
);

// get templates with goal usage for activity reports and for the "new goal" form in the RTR
// - Confirmed: we will need to exclude the grants with "active" goals from the list
// - Todo: see if a suspended goal should be included in the list
// - either way, since the existing code works, we can do the final filer on the frontend
router.get('/', authMiddleware, transactionWrapper(getGoalTemplates));

export default router;
