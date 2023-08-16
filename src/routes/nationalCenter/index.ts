import express from 'express';
import transactionWrapper from '../transactionWrapper';
import authMiddleware from '../../middleware/authMiddleware';
import {
  getHandler,
} from './handlers';

const router = express.Router();

router.get('/', authMiddleware, transactionWrapper(getHandler));

export default router;
