import express from 'express';
import transactionWrapper from '../transactionWrapper';
import { getClassScore, getMonitoringData, getTtaByCitation, getTtaByReview } from './handlers';

const router = express.Router();
router.get(
  '/:recipientId/region/:regionId/grant/:grantNumber',
  transactionWrapper(getMonitoringData)
);
router.get('/:recipientId/region/:regionId/tta/citation', transactionWrapper(getTtaByCitation));
router.get('/:recipientId/region/:regionId/tta/review', transactionWrapper(getTtaByReview));
router.get(
  '/class/:recipientId/region/:regionId/grant/:grantNumber',
  transactionWrapper(getClassScore)
);

export default router;
