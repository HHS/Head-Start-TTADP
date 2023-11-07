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
  '/regionId/:regionId/log/:id',
  (req, res, next) => checkIdParam(req, res, next, 'regionId'),
  (req, res, next) => checkIdParam(req, res, next, 'id'),
  transactionWrapper(communicationLogById, `${context} /id/:id`),
);
router.get(
  '/regionId/:regionId/recipientId/:recipientId',
  (req, res, next) => checkIdParam(req, res, next, 'regionId'),
  (req, res, next) => checkIdParam(req, res, next, 'recipientId'),
  transactionWrapper(communicationLogsByRecipientId, `${context} /recipientId/:recipientId`),
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
  '/regionId/:regionId/recipientId/:recipientId',
  (req, res, next) => checkIdParam(req, res, next, 'regionId'),
  (req, res, next) => checkIdParam(req, res, next, 'recipientId'),
  transactionWrapper(createLogByRecipientId, `${context} /recipientId/:recipientId`),
);

export default router;
