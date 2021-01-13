import express from 'express';
import {
  getApprovers, submitReport, saveReport, createReport, getReport, getParticipants,
} from './handlers';

const router = express.Router();

/**
 * API for activity reports
 */

router.post('/', createReport);
router.get('/approvers', getApprovers);
router.get('/participants', getParticipants);
router.get('/:activityReportId', getReport);
router.put('/:activityReportId', saveReport);
router.post('/:activityReportId/submit', submitReport);

export default router;
