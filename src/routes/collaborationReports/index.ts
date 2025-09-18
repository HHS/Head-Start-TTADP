import express from 'express';
import {
  createReport,
  downloadReports,
  getAlerts,
  getReport,
  getReports,
  // reviewReport,
  saveReport,
  softDeleteReport,
  // submitReport,
} from './handlers';
import transactionWrapper from '../transactionWrapper';
import { checkCollabReportIdParam } from '../../middleware/checkIdParamMiddleware';
import { nameTransactionByBase } from '../../middleware/newRelicMiddleware';

const router = express.Router();

/**
 * API for collaboration reports
 * Comment above each route matches the frontend method call
 */

// createReport
router.post('/', transactionWrapper(createReport));

// deleteReport
router.delete(
  '/:collabReportId',
  checkCollabReportIdParam,
  transactionWrapper(softDeleteReport),
);

// getAlerts
router.get('/alerts', transactionWrapper(getAlerts));

// getCSV
router.get('/csv', transactionWrapper(downloadReports));

// getReport
router.get('/:collabReportId', nameTransactionByBase, checkCollabReportIdParam, transactionWrapper(getReport));

// getReports
router.get('/', transactionWrapper(getReports));

// reviewReport
// router.put('/:collabReportId/review',
// checkCollabReportIdParam,
// transactionWrapper(reviewReport));

// saveReport
router.put('/:collabReportId', checkCollabReportIdParam, transactionWrapper(saveReport));

// submitReport
// router.put('/:collabReportId/submit',
// checkCollabReportIdParam,
// transactionWrapper(submitReport));

export default router;
