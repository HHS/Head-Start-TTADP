import express from 'express';
import { uploadHandler, linkHandler, deleteHandler } from './handlers';
import {
  checkReportIdParam,
  checkReportObjectiveIdParam,
  checkObjectiveIdParam,
  checkObjectiveTemplateIdParam,
  checkFileIdParam,
} from '../../middleware/checkIdParamMiddleware';
import transactionWrapper from '../transactionWrapper';

const router = express.Router();

/**
 * API for file uploads
 */
router.post('/', transactionWrapper(linkHandler));
router.post('/', transactionWrapper(uploadHandler));
router.delete('/:reportId?/:fileId?', checkReportIdParam, checkFileIdParam, transactionWrapper(deleteHandler));
router.delete('/:reportObjectiveId?/:fileId?', checkReportObjectiveIdParam, checkFileIdParam, transactionWrapper(deleteHandler));
router.delete('/:objectiveId?/:fileId?', checkObjectiveIdParam, checkFileIdParam, transactionWrapper(deleteHandler));
router.delete('/:objectiveTemplateId?/:fileId?', checkObjectiveTemplateIdParam, checkFileIdParam, transactionWrapper(deleteHandler));

export default router;
