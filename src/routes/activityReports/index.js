import express from 'express';
import {
  getApprovers, submitReport, saveReport, createReport, getReport, getActivityRecipients, getGoals,
} from './handlers';

const router = express.Router();

/**
 * API for activity reports
 */

router.post('/', createReport);
router.get('/approvers', getApprovers);
router.get('/activity-recipients', getActivityRecipients);
router.get('/goals', getGoals);
router.get('/:activityReportId', getReport);
router.put('/:activityReportId', saveReport);
router.post('/:activityReportId/submit', submitReport);

export default router;
