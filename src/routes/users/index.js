import express from 'express';
import {
  getPossibleCollaborators,
  getPossibleStateCodes,
  requestVerificationEmail,
  verifyEmailToken,
  getUserStatistics,
  getActiveUsers,
} from './handlers';
import transactionWrapper from '../transactionWrapper';

const router = express.Router();

/**
 * API for users
 */
router.get('/collaborators', transactionWrapper(getPossibleCollaborators));
router.get('/stateCodes', transactionWrapper(getPossibleStateCodes));
router.get('/statistics', transactionWrapper(getUserStatistics));
router.get('/active-users', transactionWrapper(getActiveUsers));

router.post('/verify-email/:token', transactionWrapper(verifyEmailToken));
router.post('/send-verification-email', transactionWrapper(requestVerificationEmail));

export default router;
