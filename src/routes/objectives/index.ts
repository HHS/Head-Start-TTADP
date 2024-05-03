import express from 'express';
import transactionWrapper from '../transactionWrapper';
import authMiddleware from '../../middleware/authMiddleware';
import {
  updateStatus,
} from './handlers';
import { checkRecipientIdParam, checkRegionIdParam } from '../../middleware/checkIdParamMiddleware';

const router = express.Router();
const context = 'objectives';

router.put(
  '/region/:regionId/:recipientId',
  authMiddleware,
  checkRegionIdParam,
  transactionWrapper(updateStatus, context),
);

export default router;
