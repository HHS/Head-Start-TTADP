import express from 'express'
import transactionWrapper from '../transactionWrapper'
import authMiddleware from '../../middleware/authMiddleware'
import { updateStatus } from './handlers'

const router = express.Router()
const context = 'objectives'

router.put('/status', authMiddleware, transactionWrapper(updateStatus, context))

export default router
