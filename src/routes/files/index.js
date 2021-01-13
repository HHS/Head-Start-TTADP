import express from 'express';
import uploadHandler from './handlers';

const router = express.Router();

/**
 * API for file uploads
 */

router.post('/', uploadHandler);

export default router;
