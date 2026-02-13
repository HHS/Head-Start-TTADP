import express from 'express'
import transactionWrapper from '../transactionWrapper'
import { getCitationsByGrants, getTextByCitation } from './handlers'
import { checkRegionIdParam } from '../../middleware/checkIdParamMiddleware'

const router = express.Router()

router.get('/region/:regionId', checkRegionIdParam, transactionWrapper(getCitationsByGrants))

router.get('/text', transactionWrapper(getTextByCitation))

export default router
