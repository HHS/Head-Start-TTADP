import express from 'express';
import authMiddleware from '../../middleware/authMiddleware';
import transactionWrapper from '../transactionWrapper';
import { singleFeedByTagHandler, whatsNewFeedHandler } from './handlers';

const router = express.Router();
router.get('/item', authMiddleware, transactionWrapper(singleFeedByTagHandler));
router.get('/whats-new', authMiddleware, transactionWrapper(whatsNewFeedHandler));

export default router;
