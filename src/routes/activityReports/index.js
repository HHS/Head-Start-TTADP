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
} from './handlers';
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
router.get('/legacy/:legacyReportId', getLegacyReport);
router.get('/download', downloadReports);
router.put('/legacy/:legacyReportId', userAdminAccessMiddleware, updateLegacyFields);
router.get('/:activityReportId', getReport);
router.get('/', getReports);
router.put('/:activityReportId', saveReport);
router.put('/:activityReportId/reset', resetToDraft);
router.put('/:activityReportId/review', reviewReport);
router.post('/:activityReportId/submit', submitReport);

export default router;
