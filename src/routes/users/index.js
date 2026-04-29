import express from 'express';
import { checkRegionIdParam, checkUserIdParam } from '../../middleware/checkIdParamMiddleware';
import transactionWrapper from '../transactionWrapper';
import {
  getActiveUsers,
  getFeatureFlags,
  getNamesByIds,
  getPossibleCollaborators,
  getPossibleStateCodes,
  getTrainingReportNationalCenterUsers,
  getTrainingReportTrainersByRegion,
  getTrainingReportTrainersByRegionAndNationalCenter,
  getTrainingReportUsers,
  requestVerificationEmail,
  setFeatureFlag,
  verifyEmailToken,
} from './handlers';

const router = express.Router();

/**
 * API for users
 */
router.get('/collaborators', transactionWrapper(getPossibleCollaborators));
router.get('/stateCodes', transactionWrapper(getPossibleStateCodes));
router.get('/active-users', transactionWrapper(getActiveUsers));
router.get('/training-report-users', transactionWrapper(getTrainingReportUsers));
router.get(
  '/trainers/regional/region/:regionId',
  checkRegionIdParam,
  transactionWrapper(getTrainingReportTrainersByRegion)
);
router.get(
  '/trainers/regional/user/:userId',
  checkUserIdParam,
  transactionWrapper(getTrainingReportTrainersByRegionAndNationalCenter)
);
router.get(
  '/trainers/national-center/region/:regionId',
  checkRegionIdParam,
  transactionWrapper(getTrainingReportNationalCenterUsers)
);
router.post('/verify-email/:token', transactionWrapper(verifyEmailToken));
router.post('/send-verification-email', transactionWrapper(requestVerificationEmail));
router.post('/feature-flags', transactionWrapper(setFeatureFlag));
router.get('/feature-flags', transactionWrapper(getFeatureFlags));
router.get('/names', transactionWrapper(getNamesByIds));

export default router;
