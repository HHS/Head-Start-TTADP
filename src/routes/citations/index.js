import express from 'express';
import { checkRegionIdParam } from '../../middleware/checkIdParamMiddleware';
import transactionWrapper from '../transactionWrapper';
import { getCitationsByGrants, getTextByCitation } from './handlers';

const router = express.Router();

router.get('/region/:regionId', checkRegionIdParam, transactionWrapper(getCitationsByGrants));

router.get('/text', transactionWrapper(getTextByCitation));

export default router;
