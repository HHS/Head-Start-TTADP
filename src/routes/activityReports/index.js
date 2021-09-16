import express from 'express';
import {
  getApprovers,
  submitReport,
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
import userAdminAccessMiddleware from '../../middleware/userAdminAccessMiddleware';

const router = express.Router();

/**
 * API for activity reports
 */

router.post('/', createReport);
router.get('/approvers', getApprovers);
router.get('/activity-recipients', getActivityRecipients);
router.get('/goals', getGoals);
router.get('/alerts', getReportAlerts);
router.get('/alerts/download-all', downloadAllAlerts);
router.get('/legacy/:legacyReportId', getLegacyReport);
router.get('/download', downloadReports);
router.get('/download-all', downloadAllReports);
router.put('/legacy/:legacyReportId', userAdminAccessMiddleware, updateLegacyFields);
router.get('/:activityReportId', checkActivityReportIdParam, getReport);
router.get('/', getReports);
router.put('/:activityReportId', checkActivityReportIdParam, saveReport);
router.delete('/:activityReportId', checkActivityReportIdParam, softDeleteReport);
router.put('/:activityReportId/reset', checkActivityReportIdParam, resetToDraft);
router.put('/:activityReportId/review', checkActivityReportIdParam, reviewReport);
router.post('/:activityReportId/submit', checkActivityReportIdParam, submitReport);

export default router;
