import express from 'express';
import authMiddleware from '../../middleware/authMiddleware';
import transactionWrapper from '../transactionWrapper';
import { updateStatus } from './handlers';

const router = express.Router();
const context = 'objectives';

router.put('/status', authMiddleware, transactionWrapper(updateStatus, context));

export default router;
