import express from 'express';
import transactionWrapper from '../transactionWrapper';
import {
  getCitationsByGrants,
} from './handlers';

const router = express.Router();

// Citations by Region ID and Grant Ids.
router.put('/:regionId', transactionWrapper(getCitationsByGrants));

export default router;
