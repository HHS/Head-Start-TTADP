import express from 'express';
import {
  checkGrantNumberParam,
  checkRecipientIdParam,
  checkRegionIdParam,
} from '../../middleware/checkIdParamMiddleware';
import transactionWrapper from '../transactionWrapper';
import { getClassScore, getMonitoringData, getTtaByCitation, getTtaByReview } from './handlers';

const router = express.Router();
router.get(
  '/:recipientId/region/:regionId/grant/:grantNumber',
  checkRecipientIdParam,
  checkRegionIdParam,
  checkGrantNumberParam,
  transactionWrapper(getMonitoringData)
);
router.get(
  '/:recipientId/region/:regionId/tta/citation',
  checkRecipientIdParam,
  checkRegionIdParam,
  transactionWrapper(getTtaByCitation)
);
router.get(
  '/:recipientId/region/:regionId/tta/review',
  checkRecipientIdParam,
  checkRegionIdParam,
  transactionWrapper(getTtaByReview)
);
router.get(
  '/class/:recipientId/region/:regionId/grant/:grantNumber',
  checkRecipientIdParam,
  checkRegionIdParam,
  checkGrantNumberParam,
  transactionWrapper(getClassScore)
);

export default router;
