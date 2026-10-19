import express from 'express';
import {
  checkRecipientIdParam,
  checkRegionIdParam,
  checkTtaRequestIdParam,
} from '../../middleware/checkIdParamMiddleware';
import { nameTransactionByBase } from '../../middleware/newRelicMiddleware';
import transactionWrapper from '../transactionWrapper';
import {
  createTtaRequest,
  getTtaRequest,
  getTtaRequests,
  getTtaRequestsByRecipient,
  saveTtaRequest,
} from './handlers';
import { checkCreateTtaRequestBody, checkUpdateTtaRequestBody } from './middleware';

const router = express.Router();

/**
 * API for TTA requests
 * Comment above each route matches the frontend method call
 */

// getTtaRequests
router.get('/', transactionWrapper(getTtaRequests));

// getTtaRequestsByRecipient
router.get(
  '/region/:regionId/recipient/:recipientId',
  checkRegionIdParam,
  checkRecipientIdParam,
  transactionWrapper(getTtaRequestsByRecipient)
);

// createTtaRequest
router.post('/', checkCreateTtaRequestBody, transactionWrapper(createTtaRequest));

// getTtaRequest
router.get(
  '/:ttaRequestId',
  nameTransactionByBase,
  checkTtaRequestIdParam,
  transactionWrapper(getTtaRequest)
);

// saveTtaRequest
router.put(
  '/:ttaRequestId',
  checkTtaRequestIdParam,
  checkUpdateTtaRequestBody,
  transactionWrapper(saveTtaRequest)
);

export default router;
