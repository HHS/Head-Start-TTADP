import express from 'express';
import transactionWrapper from '../transactionWrapper';
import {
  communicationLogById,
  communicationLogsByRecipientId,
  updateLogById,
  deleteLogById,
  createLogByRecipientId,
  communicationLogAdditionalData,
  createLogByRegionId,
  communicationLogs,
} from './handlers';
import {
  checkIdIdParam, checkRecipientIdParam, checkRegionIdParam,
} from '../../middleware/checkIdParamMiddleware';

const router = express.Router();
const context = 'communicationLog';

router.post(
  '/region/:regionId',
  checkRegionIdParam,
  transactionWrapper(createLogByRegionId, `${context} /region/:regionId`),
);
router.get(
  '/region/:regionId/log/:id',
  checkRegionIdParam,
  checkIdIdParam,
  transactionWrapper(communicationLogById, `${context} /region/:regionId/log/:id`),
);
router.get(
  '/region/:regionId/additional-data',
  checkRegionIdParam,
  transactionWrapper(communicationLogAdditionalData, `${context} /region/:regionId/additional-data`),
);
router.get(
  '/region/:regionId/recipient/:recipientId',
  checkRegionIdParam,
  checkRecipientIdParam,
  transactionWrapper(communicationLogsByRecipientId, `${context} /recipient/:recipientId`),
);
router.get(
  '/region',
  transactionWrapper(communicationLogs, `${context} /region`),
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
