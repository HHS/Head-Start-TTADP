import express from 'express';
import transactionWrapper from '../transactionWrapper';
import { getFlatResourcesDataWithCache, getResourcesDashboardData } from './handlers';

const router = express.Router();
router.get('/', transactionWrapper(getResourcesDashboardData));
router.get('/flat', transactionWrapper(getFlatResourcesDataWithCache));
export default router;
