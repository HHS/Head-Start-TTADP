import express from 'express';
import uploadHandler, { deleteHandler } from './handlers';
import { checkReportIdParam, checkFileIdParam } from '../../middleware/checkIdParamMiddleware';
import transactionWrapper from '../transactionWrapper';

const router = express.Router();

/**
 * API for file uploads
 */

router.post('/', transactionWrapper(uploadHandler));
router.delete('/:reportId?/:fileId?', checkReportIdParam, checkFileIdParam, transactionWrapper(deleteHandler));

export default router;
