import express from 'express';
import transactionWrapper from '../transactionWrapper';
import {
  communicationLogById,
  communicationLogsByRecipientId,
  updateLogById,
  deleteLogById,
  createLogByRecipientId,
} from './handlers';
import { checkIdParam } from '../../middleware/checkIdParamMiddleware';

const router = express.Router();
const context = 'communicationLog';

router.get(
  '/region/:regionId/log/:id',
  (req, res, next) => checkIdParam(req, res, next, 'regionId'),
  (req, res, next) => checkIdParam(req, res, next, 'id'),
  transactionWrapper(communicationLogById, `${context} /id/:id`),
);
router.get(
  '/region/:regionId/recipient/:recipientId',
  (req, res, next) => checkIdParam(req, res, next, 'regionId'),
  (req, res, next) => checkIdParam(req, res, next, 'recipientId'),
  transactionWrapper(communicationLogsByRecipientId, `${context} /recipient/:recipientId`),
);
router.put(
  '/log/:id',
  (req, res, next) => checkIdParam(req, res, next, 'id'),
  transactionWrapper(updateLogById, `${context} /id/:id`),
);
router.delete(
  '/log/:id',
  (req, res, next) => checkIdParam(req, res, next, 'id'),
  transactionWrapper(deleteLogById, `${context} /id/:id`),
);
router.post(
  '/region/:regionId/recipient/:recipientId',
  (req, res, next) => checkIdParam(req, res, next, 'regionId'),
  (req, res, next) => checkIdParam(req, res, next, 'recipientId'),
  transactionWrapper(createLogByRecipientId, `${context} /recipient/:recipientId`),
);

export default router;
