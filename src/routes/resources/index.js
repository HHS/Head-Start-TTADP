import express from 'express';
import {
  getResourcesDashboardData,
  getFlatResourcesDashboardData,
} from './handlers';
import transactionWrapper from '../transactionWrapper';

const router = express.Router();
router.get('/', transactionWrapper(getResourcesDashboardData));
router.get('/flat', transactionWrapper(getFlatResourcesDashboardData));
export default router;
