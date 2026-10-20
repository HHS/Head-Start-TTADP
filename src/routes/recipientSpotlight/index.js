import express from 'express';
import { checkGrantIdQueryParam } from '../../middleware/checkIdParamMiddleware';
import transactionWrapper from '../transactionWrapper';
import { getRecipientSpotLight } from './handlers';

const router = express.Router();
router.get('/', checkGrantIdQueryParam, transactionWrapper(getRecipientSpotLight));

export default router;
