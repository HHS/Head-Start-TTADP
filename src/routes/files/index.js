import express from 'express';
import {
  uploadHandler,
  deleteHandler,
  deleteObjectiveFileHandler,
  deleteOnlyFile,
  uploadObjectivesFile,
  deleteActivityReportObjectiveFile,
} from './handlers';
import {
  checkReportIdParam,
  checkObjectiveIdParam,
  checkObjectiveTemplateIdParam,
  checkFileIdParam,
  checkIdParam,
} from '../../middleware/checkIdParamMiddleware';
import transactionWrapper from '../transactionWrapper';

const router = express.Router();

/**
 * API for file uploads
 */
router.post('/', transactionWrapper(uploadHandler));
router.post('/objectives', transactionWrapper(uploadObjectivesFile));
router.delete('/s/:eventSessionId/:fileId', (req, res, next) => checkIdParam(req, res, next, 'eventSessionId'), checkFileIdParam, transactionWrapper(deleteHandler));
router.delete('/:fileId?', checkFileIdParam, transactionWrapper(deleteOnlyFile));
router.delete('/r/:reportId?/:fileId?', checkReportIdParam, checkFileIdParam, transactionWrapper(deleteHandler));
router.delete('/:fileId/objectives', checkFileIdParam, transactionWrapper(deleteObjectiveFileHandler));
router.delete('/o/:objectiveId?/:fileId?', checkObjectiveIdParam, checkFileIdParam, transactionWrapper(deleteHandler));
router.delete('/ot/:objectiveTemplateId?/:fileId?', checkObjectiveTemplateIdParam, checkFileIdParam, transactionWrapper(deleteHandler));
router.delete('/report/:reportId?/file/:fileId?', checkReportIdParam, checkFileIdParam, transactionWrapper(deleteActivityReportObjectiveFile));

export default router;
