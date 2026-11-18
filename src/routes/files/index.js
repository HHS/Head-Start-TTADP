import express from 'express';
import {
  checkCommunicationLogIdParam,
  checkFileIdParam,
  checkIdParam,
  checkReportIdParam,
  checkSessionAttachmentIdParam,
} from '../../middleware/checkIdParamMiddleware';
import transactionWrapper from '../transactionWrapper';
import { deleteActivityReportObjectiveFile, deleteHandler, uploadHandler } from './handlers';

const router = express.Router();
const context = 'files';

/**
 * API for file uploads
 */
router.post('/', transactionWrapper(uploadHandler));
router.delete(
  '/s/:eventSessionId/:fileId',
  (req, res, next) => checkIdParam(req, res, next, 'eventSessionId'),
  checkFileIdParam,
  transactionWrapper(deleteHandler, `${context} /s/:eventSessionId/:fileId`)
);
// No parent named: deleteHandler refuses it with a 400.
router.delete(
  '/:fileId?',
  checkFileIdParam,
  transactionWrapper(deleteHandler, `${context} /:fileId?`)
);
router.delete(
  '/r/:reportId?/:fileId?',
  checkReportIdParam,
  checkFileIdParam,
  transactionWrapper(deleteHandler, `${context} /r/:reportId?/:fileId?`)
);
router.delete(
  '/l/:communicationLogId/:fileId?',
  checkCommunicationLogIdParam,
  checkFileIdParam,
  transactionWrapper(deleteHandler, `${context} /r/:communicationLogId/:fileId?`)
);
router.delete(
  '/ssa/:sessionAttachmentId/:fileId?',
  checkSessionAttachmentIdParam,
  checkFileIdParam,
  transactionWrapper(deleteHandler, `${context} /ssa/:sessionAttachmentId/:fileId?`)
);
router.delete(
  '/report/:reportId?/file/:fileId?',
  checkReportIdParam,
  checkFileIdParam,
  transactionWrapper(deleteActivityReportObjectiveFile)
);

export default router;
