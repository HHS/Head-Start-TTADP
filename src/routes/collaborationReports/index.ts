import express from 'express';
import { checkCollabReportIdParam } from '../../middleware/checkIdParamMiddleware';
import { nameTransactionByBase } from '../../middleware/newRelicMiddleware';
import transactionWrapper from '../transactionWrapper';
import {
  createReport,
  downloadReports,
  getAlerts,
  getReport,
  getReports,
  reviewReport,
  saveReport,
  softDeleteReport,
  submitReport,
  unlockReport,
} from './handlers';

const router = express.Router();

/**
 * API for collaboration reports
 * Comment above each route matches the frontend method call
 */

// createReport
router.post('/', transactionWrapper(createReport));

// deleteReport
router.delete('/:collabReportId', checkCollabReportIdParam, transactionWrapper(softDeleteReport));

// getAlerts
router.get('/alerts', transactionWrapper(getAlerts));

// getCSV
router.get('/csv', transactionWrapper(downloadReports));

// getReport
router.get(
  '/:collabReportId',
  nameTransactionByBase,
  checkCollabReportIdParam,
  transactionWrapper(getReport)
);

// getReports
router.get('/', transactionWrapper(getReports));

// reviewReport
router.put('/:collabReportId/review', checkCollabReportIdParam, transactionWrapper(reviewReport));

// submitReport
router.put('/:collabReportId/submit', checkCollabReportIdParam, transactionWrapper(submitReport));

// unlockReport
router.put('/:collabReportId/unlock', checkCollabReportIdParam, transactionWrapper(unlockReport));

// saveReport
router.put('/:collabReportId', checkCollabReportIdParam, transactionWrapper(saveReport));

export default router;
