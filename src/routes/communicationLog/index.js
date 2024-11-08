import express from 'express';
import transactionWrapper from '../transactionWrapper';
import {
  communicationLogById,
  communicationLogsByRecipientId,
  updateLogById,
  deleteLogById,
  createLogByRecipientId,
} from './handlers';
import {
  checkIdIdParam, checkRecipientIdParam, checkRegionIdParam,
} from '../../middleware/checkIdParamMiddleware';

const router = express.Router();
const context = 'communicationLog';

router.get(
  '/region/:regionId/log/:id',
  checkRegionIdParam,
  checkIdIdParam,
  transactionWrapper(communicationLogById, `${context} /id/:id`),
);
router.get(
  '/region/:regionId/recipient/:recipientId',
  checkRegionIdParam,
  checkRecipientIdParam,
  transactionWrapper(communicationLogsByRecipientId, `${context} /recipient/:recipientId`),
);
router.put(
  '/log/:id',
  checkIdIdParam,
  transactionWrapper(updateLogById, `${context} /id/:id`),
);
router.delete(
  '/log/:id',
  checkIdIdParam,
  transactionWrapper(deleteLogById, `${context} /id/:id`),
);
router.post(
  '/region/:regionId/recipient/:recipientId',
  checkRegionIdParam,
  checkRecipientIdParam,
  transactionWrapper(createLogByRecipientId, `${context} /recipient/:recipientId`),
);

export default router;
