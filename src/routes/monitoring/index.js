import express from 'express';
import { getClassScore, getMonitoringData } from './handlers';
import transactionWrapper from '../transactionWrapper';

const router = express.Router();
router.get('/:recipientId/region/:regionId/grant/:grantNumber', transactionWrapper(getMonitoringData));
router.get('/class/:recipientId/region/:regionId/grant/:grantNumber', transactionWrapper(getClassScore));

export default router;
