import express from 'express';
import {
  getApprovers,
  submitReport,
  unlockReport,
  saveReport,
  createReport,
  getReport,
  getReports,
  getReportAlerts,
  getActivityRecipients,
  getGoals,
  reviewReport,
  resetToDraft,
  getLegacyReport,
  downloadReports,
  updateLegacyFields,
  softDeleteReport,
  downloadAllReports,
  downloadAllAlerts,
} from './handlers';
import { checkActivityReportIdParam } from '../../middleware/checkIdParamMiddleware';
import { nameTransactionByBase, nameTransactionByPath } from '../../middleware/newRelicMiddleware';
import userAdminAccessMiddleware from '../../middleware/userAdminAccessMiddleware';
import transactionWrapper from '../transactionWrapper';

const router = express.Router();

/**
 * API for activity reports
 */

router.post('/', transactionWrapper(createReport));
router.get('/approvers', transactionWrapper(getApprovers));
router.get('/activity-recipients', transactionWrapper(getActivityRecipients));
router.get('/goals', transactionWrapper(getGoals));
router.get('/alerts', nameTransactionByPath, transactionWrapper(getReportAlerts));
router.get('/alerts/download-all', transactionWrapper(downloadAllAlerts));
router.get('/legacy/:legacyReportId', transactionWrapper(getLegacyReport));
router.get('/download', transactionWrapper(downloadReports));
router.get('/download-all', nameTransactionByPath, transactionWrapper(downloadAllReports));
router.put('/legacy/:legacyReportId', userAdminAccessMiddleware, transactionWrapper(updateLegacyFields));
router.get('/:activityReportId', nameTransactionByBase, checkActivityReportIdParam, transactionWrapper(getReport));
router.get('/', transactionWrapper(getReports));
router.put('/:activityReportId', checkActivityReportIdParam, transactionWrapper(saveReport));
router.delete('/:activityReportId', checkActivityReportIdParam, transactionWrapper(softDeleteReport));
router.put('/:activityReportId/reset', checkActivityReportIdParam, transactionWrapper(resetToDraft));
router.put('/:activityReportId/review', checkActivityReportIdParam, transactionWrapper(reviewReport));
router.put('/:activityReportId/submit', checkActivityReportIdParam, transactionWrapper(submitReport));
router.put('/:activityReportId/unlock', checkActivityReportIdParam, transactionWrapper(unlockReport));

export default router;
