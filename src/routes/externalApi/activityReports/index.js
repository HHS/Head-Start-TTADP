import express from 'express';

import {
  getReportByDisplayId,
} from './handlers';

const router = express.Router();

router.get('/display/:displayId', getReportByDisplayId);

export default router;
