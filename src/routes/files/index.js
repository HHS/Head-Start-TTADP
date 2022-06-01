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
router.post('/link/', transactionWrapper(linkHandler));
router.post('/', transactionWrapper(uploadHandler));
router.delete('/r/:reportId?/:fileId?', checkReportIdParam, checkFileIdParam, transactionWrapper(deleteHandler));
router.delete('/ro/:reportObjectiveId?/:fileId?', checkReportObjectiveIdParam, checkFileIdParam, transactionWrapper(deleteHandler));
router.delete('/o/:objectiveId?/:fileId?', checkObjectiveIdParam, checkFileIdParam, transactionWrapper(deleteHandler));
router.delete('/ot/:objectiveTemplateId?/:fileId?', checkObjectiveTemplateIdParam, checkFileIdParam, transactionWrapper(deleteHandler));

export default router;
