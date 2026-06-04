import express from 'express';
import authMiddleware from '../../middleware/authMiddleware';
import transactionWrapper from '../transactionWrapper';
import { getSiteAlerts } from './handlers';

const router = express.Router();

/**
 * API for site alerts
 */

// we only check to see if they have site access to get the alerts
router.get('/', authMiddleware, transactionWrapper(getSiteAlerts));

export default router;
