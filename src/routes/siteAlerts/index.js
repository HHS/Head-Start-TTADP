import express from 'express';
import { getSiteAlerts } from './handlers';
import transactionWrapper from '../transactionWrapper';

const router = express.Router();

/**
 * API for activity reports
 */

router.get('/', transactionWrapper(getSiteAlerts));

export default router;
