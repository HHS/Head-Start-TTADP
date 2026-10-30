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
  getTtaRequestReviewers,
  getTtaRequests,
  getTtaRequestsByRecipient,
  saveTtaRequest,
  submitTtaRequest,
} from './handlers';
import {
  checkCreateTtaRequestBody,
  checkSubmitTtaRequestBody,
  checkUpdateTtaRequestBody,
} from './middleware';

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

// getTtaRequestReviewers
router.get(
  '/region/:regionId/reviewers',
  checkRegionIdParam,
  transactionWrapper(getTtaRequestReviewers)
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

// submitTtaRequest
router.put(
  '/:ttaRequestId/submit',
  checkTtaRequestIdParam,
  checkSubmitTtaRequestBody,
  transactionWrapper(submitTtaRequest)
);

// saveTtaRequest
router.put(
  '/:ttaRequestId',
  checkTtaRequestIdParam,
  checkUpdateTtaRequestBody,
  transactionWrapper(saveTtaRequest)
);

export default router;
