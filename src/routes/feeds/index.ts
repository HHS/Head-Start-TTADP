import express from 'express'
import transactionWrapper from '../transactionWrapper'
import authMiddleware from '../../middleware/authMiddleware'
import { whatsNewFeedHandler, singleFeedByTagHandler } from './handlers'

const router = express.Router()
router.get('/item', authMiddleware, transactionWrapper(singleFeedByTagHandler))
router.get('/whats-new', authMiddleware, transactionWrapper(whatsNewFeedHandler))

export default router
