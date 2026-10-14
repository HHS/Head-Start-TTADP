import express from 'express';
import { checkTtaRequestIdParam } from '../../middleware/checkIdParamMiddleware';
import { nameTransactionByBase } from '../../middleware/newRelicMiddleware';
import transactionWrapper from '../transactionWrapper';
import { createTtaRequest, getTtaRequest, saveTtaRequest } from './handlers';
import { checkCreateTtaRequestBody, checkUpdateTtaRequestBody } from './middleware';

const router = express.Router();

/**
 * API for TTA requests
 * Comment above each route matches the frontend method call
 */

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
