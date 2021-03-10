import express from 'express';
import uploadHandler, { deleteHandler } from './handlers';

const router = express.Router();

/**
 * API for file uploads
 */

router.post('/', uploadHandler);
router.delete('/:reportId/:fileId', deleteHandler);

export default router;
