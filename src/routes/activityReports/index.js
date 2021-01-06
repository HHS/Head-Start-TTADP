import express from 'express';
import {
  getApprovers, submitReport,
} from './handlers';

const router = express.Router();

/**
 * API for activity reports
 */

router.get('/approvers', getApprovers);
router.post('/submit', submitReport);

export default router;
