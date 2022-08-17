import express from 'express';
import {
  uploadHandler,
  linkHandler,
  deleteHandler,
  onlyFileUploadHandler,
  deleteOnlyFile,
  uploadObjectivesFile,
} from './handlers';
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
router.post('/upload', transactionWrapper(onlyFileUploadHandler));
router.post('/objectives', transactionWrapper(uploadObjectivesFile));
router.delete('/:fileId?', checkFileIdParam, transactionWrapper(deleteOnlyFile));
router.delete('/r/:reportId?/:fileId?', checkReportIdParam, checkFileIdParam, transactionWrapper(deleteHandler));
router.delete('/ro/:reportObjectiveId?/:fileId?', checkReportObjectiveIdParam, checkFileIdParam, transactionWrapper(deleteHandler));
router.delete('/o/:objectiveId?/:fileId?', checkObjectiveIdParam, checkFileIdParam, transactionWrapper(deleteHandler));
router.delete('/ot/:objectiveTemplateId?/:fileId?', checkObjectiveTemplateIdParam, checkFileIdParam, transactionWrapper(deleteHandler));

export default router;
