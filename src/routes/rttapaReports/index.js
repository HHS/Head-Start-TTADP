import express from 'express';
import { createRttapa, getRttapa, getRttapas } from './handlers';
import transactionWrapper from '../transactionWrapper';

const router = express.Router();

/**
 * API for activity reports
 */

router.get('/region/:regionId/recipient/:recipientId', transactionWrapper(getRttapas));
router.get('/:reportId', transactionWrapper(getRttapa));
router.post('/', transactionWrapper(createRttapa));

export default router;
