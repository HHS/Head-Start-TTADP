import express from 'express';
import transactionWrapper from '../transactionWrapper';
import {
  getCitationsByGrants,
} from './handlers';
import {
  checkRegionIdParam,
} from '../../middleware/checkIdParamMiddleware';

const router = express.Router();

router.get(
  '/region/:regionId',
  checkRegionIdParam,
  transactionWrapper(getCitationsByGrants),
);

export default router;
