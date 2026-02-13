import express from 'express'
import transactionWrapper from '../transactionWrapper'
import { createHandler, updateHandler, getHandler, deleteHandler, getByStatus, getTrainingReportAlertsHandler } from './handlers'

const router = express.Router()
const context = 'events'

router.get('/id/:eventId', transactionWrapper(getHandler, `${context} /id/:eventId`))
router.get('/regionId/:regionId', transactionWrapper(getHandler, `${context} /regionId/:regionId`))
router.get('/alerts', transactionWrapper(getTrainingReportAlertsHandler))
router.get('/:status', transactionWrapper(getByStatus))
router.get('/ownerId/:ownerId', transactionWrapper(getHandler, `${context} /ownerId/:ownerId`))
router.get('/pocId/:pocId', transactionWrapper(getHandler, `${context} /pocId/:pocId`))
router.get('/collaboratorId/:collaboratorId', transactionWrapper(getHandler, `${context} /collaboratorId/:collaboratorId`))
router.post('/', transactionWrapper(createHandler, context))
router.put('/id/:eventId', transactionWrapper(updateHandler, context))
router.delete('/id/:eventId', transactionWrapper(deleteHandler, context))

export default router
