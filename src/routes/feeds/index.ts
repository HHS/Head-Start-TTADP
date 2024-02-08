import express from 'express';
import transactionWrapper from '../transactionWrapper';
import authMiddleware from '../../middleware/authMiddleware';
import { whatsNewFeedHandler, singleFeedByTagHandler, classGuidanceFeedHandler } from './handlers';

const router = express.Router();
router.get('/item', authMiddleware, transactionWrapper(singleFeedByTagHandler));
router.get('/whats-new', authMiddleware, transactionWrapper(whatsNewFeedHandler));
router.get('/class-guidance', authMiddleware, transactionWrapper(classGuidanceFeedHandler));

export default router;
