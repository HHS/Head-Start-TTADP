import express from 'express';
import transactionWrapper from '../../transactionWrapper';
import authMiddleware from '../../../middleware/authMiddleware';
import {
  listQueries,
  getFlags,
  runQuery,
} from './handlers';

const router = express.Router();
router.get('/list-queries', authMiddleware, transactionWrapper(listQueries));
router.get('/get-flags', authMiddleware, transactionWrapper(getFlags));
router.get('/run-query', authMiddleware, transactionWrapper(runQuery));

export default router;
