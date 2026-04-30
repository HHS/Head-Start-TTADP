import express from 'express';
import transactionWrapper from '../../transactionWrapper';
import { getReportByDisplayId } from './handlers';

const router = express.Router();

router.get('/display/:displayId', transactionWrapper(getReportByDisplayId));

export default router;
