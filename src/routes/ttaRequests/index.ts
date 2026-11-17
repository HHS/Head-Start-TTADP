import express from 'express';
import {
  checkRecipientIdParam,
  checkRegionIdParam,
  checkTtaRequestIdParam,
} from '../../middleware/checkIdParamMiddleware';
import { nameTransactionByBase } from '../../middleware/newRelicMiddleware';
import transactionWrapper from '../transactionWrapper';
import {
  approveTtaRequest,
  createTtaRequest,
  getApprovedTtaRequests,
  getApprovedTtaRequestsByRecipient,
  getTtaRequest,
  getTtaRequestApprovers,
  getTtaRequestAssignableStaff,
  getTtaRequestReviewers,
  getTtaRequests,
  getTtaRequestsByRecipient,
  reviewTtaRequest,
  saveTtaRequest,
  submitTtaRequest,
} from './handlers';
import {
  checkApproveTtaRequestBody,
  checkCreateTtaRequestBody,
  checkReviewTtaRequestBody,
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

// getApprovedTtaRequests; before the request routes, which would take it for a request id
router.get('/approved', transactionWrapper(getApprovedTtaRequests));

// getApprovedTtaRequestsByRecipient
router.get(
  '/region/:regionId/recipient/:recipientId/approved',
  checkRegionIdParam,
  checkRecipientIdParam,
  transactionWrapper(getApprovedTtaRequestsByRecipient)
);

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

// getTtaRequestAssignableStaff
router.get(
  '/region/:regionId/assignable-staff',
  checkRegionIdParam,
  transactionWrapper(getTtaRequestAssignableStaff)
);

// getTtaRequestApprovers
router.get(
  '/region/:regionId/approvers',
  checkRegionIdParam,
  transactionWrapper(getTtaRequestApprovers)
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

// reviewTtaRequest
router.put(
  '/:ttaRequestId/review',
  checkTtaRequestIdParam,
  checkReviewTtaRequestBody,
  transactionWrapper(reviewTtaRequest)
);

// approveTtaRequest
router.put(
  '/:ttaRequestId/approve',
  checkTtaRequestIdParam,
  checkApproveTtaRequestBody,
  transactionWrapper(approveTtaRequest)
);

// saveTtaRequest
router.put(
  '/:ttaRequestId',
  checkTtaRequestIdParam,
  checkUpdateTtaRequestBody,
  transactionWrapper(saveTtaRequest)
);

export default router;
