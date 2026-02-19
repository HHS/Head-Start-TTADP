import express from 'express';
import {
  getRecipientSpotLight,
} from './handlers';
import transactionWrapper from '../transactionWrapper';
import { checkGrantIdQueryParam } from '../../middleware/checkIdParamMiddleware';

const router = express.Router();
router.get('/', checkGrantIdQueryParam, transactionWrapper(getRecipientSpotLight));

export default router;
