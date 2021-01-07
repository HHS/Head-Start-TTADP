import express from 'express';
import {
  getApprovers, submitReport, saveReport, getReport,
} from './handlers';

const router = express.Router();

/**
 * API for activity reports
 */

router.post('/', saveReport);
router.get('/approvers', getApprovers);
router.post('/submit', submitReport);
router.get('/:reportId', getReport);

export default router;
