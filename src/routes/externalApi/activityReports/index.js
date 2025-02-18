import express from 'express';

import {
  getReportByDisplayId,
} from './handlers';
import transactionWrapper from '../../transactionWrapper';

const router = express.Router();

router.get('/display/:displayId', transactionWrapper(getReportByDisplayId));

export default router;
