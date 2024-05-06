import express from 'express';
import transactionWrapper from '../transactionWrapper';
import authMiddleware from '../../middleware/authMiddleware';
import {
  updateStatus,
} from './handlers';
import { checkRegionIdParam } from '../../middleware/checkIdParamMiddleware';

const router = express.Router();
const context = 'objectives';

router.put(
  '/region/:regionId/status',
  authMiddleware,
  checkRegionIdParam,
  transactionWrapper(updateStatus, context),
);

export default router;
