import express from 'express';
import authMiddleware from '../../middleware/authMiddleware';
import transactionWrapper from '../transactionWrapper';
import { getHandler } from './handlers';

const router = express.Router();
const context = 'nationalCenter';

router.get('/', authMiddleware, transactionWrapper(getHandler, context));

export default router;
