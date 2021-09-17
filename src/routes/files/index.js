import express from 'express';
import uploadHandler, { deleteHandler } from './handlers';
import { checkReportIdParam, checkFileIdParam } from '../../middleware/checkIdParamMiddleware';

const router = express.Router();

/**
 * API for file uploads
 */

router.post('/', uploadHandler);
router.delete('/:reportId?/:fileId?', checkReportIdParam, checkFileIdParam, deleteHandler);

export default router;
