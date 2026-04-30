import express from 'express';
import authMiddleware from '../../middleware/authMiddleware';
import { readOnlyTransactionWrapper } from '../transactionWrapper';
import {
  getFilters,
  getFiltersWithWildcard,
  listQueries,
  listQueriesWithWildcard,
  runQuery,
  runQueryWithWildcard,
} from './handlers';

const router = express.Router();
router.get('/list-queries', authMiddleware, readOnlyTransactionWrapper(listQueries));
router.get('/get-filters', authMiddleware, readOnlyTransactionWrapper(getFilters));
router.get('/run-query', authMiddleware, readOnlyTransactionWrapper(runQuery));

// Catch-all for wildcard paths (place these last to avoid conflicts)
router.get('/*/list', authMiddleware, readOnlyTransactionWrapper(listQueriesWithWildcard));
router.get('/*/filters', authMiddleware, readOnlyTransactionWrapper(getFiltersWithWildcard));
router.get('/*', authMiddleware, readOnlyTransactionWrapper(runQueryWithWildcard));

export default router;
