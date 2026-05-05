import express from 'express';
import { checkActivityReportIdParam } from '../../middleware/checkIdParamMiddleware';
import { nameTransactionByBase, nameTransactionByPath } from '../../middleware/newRelicMiddleware';
import userAdminAccessMiddleware from '../../middleware/userAdminAccessMiddleware';
import { createGoalsForReport } from '../goals/handlers';
import transactionWrapper from '../transactionWrapper';
import {
  createReport,
  downloadAllAlerts,
  downloadAllReports,
  downloadReports,
  getActivityRecipients,
  getActivityRecipientsForExistingReport,
  getApprovers,
  getGoals,
  getGroups,
  getLegacyReport,
  getReport,
  getReportAlerts,
  getReports,
  getReportsByManyIds,
  getReportsForLocalStorageCleanup,
  resetToDraft,
  reviewReport,
  saveOtherEntityObjectivesForReport,
  saveReport,
  setGoalAsActivelyEdited,
  softDeleteReport,
  submitReport,
  unlockReport,
  updateLegacyFields,
} from './handlers';
import { checkReviewReportBody } from './middleware';

const router = express.Router();

/**
 * API for activity reports
 */

router.post('/', transactionWrapper(createReport));
router.get('/approvers', transactionWrapper(getApprovers));
router.get('/groups', transactionWrapper(getGroups));
router.get('/activity-recipients', transactionWrapper(getActivityRecipients));
router.get(
  '/activity-recipients/:reportId',
  transactionWrapper(getActivityRecipientsForExistingReport)
);
router.get('/goals', transactionWrapper(getGoals));
router.post('/goals', transactionWrapper(createGoalsForReport));
router.post('/objectives', transactionWrapper(saveOtherEntityObjectivesForReport));
router.get('/alerts', nameTransactionByPath, transactionWrapper(getReportAlerts));
router.get(
  '/storage-cleanup',
  nameTransactionByPath,
  transactionWrapper(getReportsForLocalStorageCleanup)
);
router.get('/alerts/download-all', transactionWrapper(downloadAllAlerts));
router.get('/legacy/:legacyReportId', transactionWrapper(getLegacyReport));
router.get('/download', transactionWrapper(downloadReports));
router.get('/download-all', nameTransactionByPath, transactionWrapper(downloadAllReports));
router.put(
  '/legacy/:legacyReportId',
  userAdminAccessMiddleware,
  transactionWrapper(updateLegacyFields)
);
router.get(
  '/:activityReportId',
  nameTransactionByBase,
  checkActivityReportIdParam,
  transactionWrapper(getReport)
);
router.get('/', transactionWrapper(getReports));
router.post('/reportsByManyIds', transactionWrapper(getReportsByManyIds));

router.delete(
  '/:activityReportId',
  checkActivityReportIdParam,
  transactionWrapper(softDeleteReport)
);
router.put(
  '/:activityReportId/reset',
  checkActivityReportIdParam,
  transactionWrapper(resetToDraft)
);
router.put(
  '/:activityReportId/review',
  checkActivityReportIdParam,
  checkReviewReportBody,
  transactionWrapper(reviewReport)
);
router.put(
  '/:activityReportId/submit',
  checkActivityReportIdParam,
  transactionWrapper(submitReport)
);
router.put(
  '/:activityReportId/unlock',
  checkActivityReportIdParam,
  transactionWrapper(unlockReport)
);
router.put(
  '/:activityReportId/goals/edit',
  checkActivityReportIdParam,
  transactionWrapper(setGoalAsActivelyEdited)
);
router.get(
  '/:activityReportId/activity-recipients',
  transactionWrapper(getActivityRecipientsForExistingReport)
);
router.put('/:activityReportId', checkActivityReportIdParam, transactionWrapper(saveReport));

export default router;
