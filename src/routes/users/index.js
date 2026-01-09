import express from 'express';
import {
  getPossibleCollaborators,
  getPossibleStateCodes,
  requestVerificationEmail,
  verifyEmailToken,
  getActiveUsers,
  setFeatureFlag,
  getFeatureFlags,
  getTrainingReportUsers,
  getNamesByIds,
  getTrainingReportTrainersByRegion,
  getTrainingReportNationalCenterUsers,
} from './handlers';
import transactionWrapper from '../transactionWrapper';
import {
  checkRegionIdParam,
  checkUserIdParam,
} from '../../middleware/checkIdParamMiddleware';

const router = express.Router();

/**
 * API for users
 */
router.get('/collaborators', transactionWrapper(getPossibleCollaborators));
router.get('/stateCodes', transactionWrapper(getPossibleStateCodes));
router.get('/active-users', transactionWrapper(getActiveUsers));
router.get('/training-report-users', transactionWrapper(getTrainingReportUsers));
router.get('/trainers/regional/region/:regionId', checkRegionIdParam, transactionWrapper(getTrainingReportTrainersByRegion));
router.get('/trainers/regional/user/:userId', checkUserIdParam, transactionWrapper(getTrainingReportTrainersByRegion));
router.get('/trainers/national-center/region/:regionId', checkRegionIdParam, transactionWrapper(getTrainingReportNationalCenterUsers));
router.post('/verify-email/:token', transactionWrapper(verifyEmailToken));
router.post('/send-verification-email', transactionWrapper(requestVerificationEmail));
router.post('/feature-flags', transactionWrapper(setFeatureFlag));
router.get('/feature-flags', transactionWrapper(getFeatureFlags));
router.get('/names', transactionWrapper(getNamesByIds));

export default router;
