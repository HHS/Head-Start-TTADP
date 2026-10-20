import express from 'express';
import transactionWrapper from '../transactionWrapper';
import { getCitationReviewTypes } from './handlers';

const router = express.Router();

router.get('/citation-review-types', transactionWrapper(getCitationReviewTypes));

export default router;
