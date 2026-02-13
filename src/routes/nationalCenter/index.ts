import express from 'express'
import transactionWrapper from '../transactionWrapper'
import authMiddleware from '../../middleware/authMiddleware'
import { getHandler } from './handlers'

const router = express.Router()
const context = 'nationalCenter'

router.get('/', authMiddleware, transactionWrapper(getHandler, context))

export default router
