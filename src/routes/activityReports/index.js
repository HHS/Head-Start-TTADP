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

const router = express.Router();

/**
 * API for activity reports
 */

router.post('/', createReport);
router.get('/approvers', getApprovers);
router.get('/activity-recipients', getActivityRecipients);
router.get('/goals', getGoals);
router.get('/alerts', nameTransactionByPath, getReportAlerts);
router.get('/alerts/download-all', downloadAllAlerts);
router.get('/legacy/:legacyReportId', getLegacyReport);
router.get('/download', downloadReports);
router.get('/download-all', nameTransactionByPath, downloadAllReports);
router.put('/legacy/:legacyReportId', userAdminAccessMiddleware, updateLegacyFields);
router.get('/:activityReportId', nameTransactionByBase, checkActivityReportIdParam, getReport);
router.get('/', getReports);
router.put('/:activityReportId', checkActivityReportIdParam, saveReport);
router.delete('/:activityReportId', checkActivityReportIdParam, softDeleteReport);
router.put('/:activityReportId/reset', checkActivityReportIdParam, resetToDraft);
router.put('/:activityReportId/review', checkActivityReportIdParam, reviewReport);
router.put('/:activityReportId/submit', checkActivityReportIdParam, submitReport);
router.put('/:activityReportId/unlock', checkActivityReportIdParam, unlockReport);

export default router;
