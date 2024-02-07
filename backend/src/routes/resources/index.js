import express from 'express';
import {
  getResourcesDashboardData,
} from './handlers';
import transactionWrapper from '../transactionWrapper';

const router = express.Router();
router.get('/', transactionWrapper(getResourcesDashboardData));
export default router;
