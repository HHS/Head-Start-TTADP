import express from 'express'
import { getResourcesDashboardData, getFlatResourcesDataWithCache } from './handlers'
import transactionWrapper from '../transactionWrapper'

const router = express.Router()
router.get('/', transactionWrapper(getResourcesDashboardData))
router.get('/flat', transactionWrapper(getFlatResourcesDataWithCache))
export default router
