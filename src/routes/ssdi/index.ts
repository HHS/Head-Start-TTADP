import express from 'express';
import transactionWrapper from '../transactionWrapper';
import authMiddleware from '../../middleware/authMiddleware';
import {
  listQueries,
  getFilters,
  runQuery,
  listQueriesWithWildcard,
  getFiltersWithWildcard,
  runQueryWithWildcard,
} from './handlers';

const router = express.Router();
router.get('/list-queries', authMiddleware, transactionWrapper(listQueries));
router.get('/get-filters', authMiddleware, transactionWrapper(getFilters));
router.get('/run-query', authMiddleware, transactionWrapper(runQuery));

// Catch-all for wildcard paths (place these last to avoid conflicts)
router.get('/*/list', authMiddleware, transactionWrapper(listQueriesWithWildcard));
router.get('/*/filters', authMiddleware, transactionWrapper(getFiltersWithWildcard));
router.get('/*', authMiddleware, transactionWrapper(runQueryWithWildcard));

export default router;
