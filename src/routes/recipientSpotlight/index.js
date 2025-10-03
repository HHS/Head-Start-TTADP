import express from 'express';
import {
  getRecipientSpotLight,
} from './handlers';
import transactionWrapper from '../transactionWrapper';

const router = express.Router();
router.get('/', transactionWrapper(getRecipientSpotLight));

export default router;
