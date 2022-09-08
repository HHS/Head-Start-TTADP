import express from 'express';
import {
  uploadHandler,
  linkHandler,
  deleteHandler,
  deleteObjectiveFileHandler,
  onlyFileUploadHandler,
  deleteOnlyFile,
  uploadObjectivesFile,
} from './handlers';
import {
  checkReportIdParam,
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
router.delete('/:fileId/objectives', checkFileIdParam, transactionWrapper(deleteObjectiveFileHandler));
router.delete('/o/:objectiveId?/:fileId?', checkObjectiveIdParam, checkFileIdParam, transactionWrapper(deleteHandler));
router.delete('/ot/:objectiveTemplateId?/:fileId?', checkObjectiveTemplateIdParam, checkFileIdParam, transactionWrapper(deleteHandler));

export default router;
