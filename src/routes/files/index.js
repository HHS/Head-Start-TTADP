import express from 'express'
import { uploadHandler, deleteHandler, deleteOnlyFile, deleteActivityReportObjectiveFile } from './handlers'
import {
  checkReportIdParam,
  checkObjectiveIdParam,
  checkObjectiveTemplateIdParam,
  checkFileIdParam,
  checkIdParam,
  checkCommunicationLogIdParam,
  checkSessionAttachmentIdParam,
} from '../../middleware/checkIdParamMiddleware'
import transactionWrapper from '../transactionWrapper'

const router = express.Router()
const context = 'files'

/**
 * API for file uploads
 */
router.post('/', transactionWrapper(uploadHandler))
router.delete(
  '/s/:eventSessionId/:fileId',
  (req, res, next) => checkIdParam(req, res, next, 'eventSessionId'),
  checkFileIdParam,
  transactionWrapper(deleteHandler, `${context} /s/:eventSessionId/:fileId`)
)
router.delete('/:fileId?', checkFileIdParam, transactionWrapper(deleteOnlyFile))
router.delete('/r/:reportId?/:fileId?', checkReportIdParam, checkFileIdParam, transactionWrapper(deleteHandler, `${context} /r/:reportId?/:fileId?`))
router.delete(
  '/l/:communicationLogId/:fileId?',
  checkCommunicationLogIdParam,
  checkFileIdParam,
  transactionWrapper(deleteHandler, `${context} /r/:communicationLogId/:fileId?`)
)
router.delete(
  '/ssa/:sessionAttachmentId/:fileId?',
  checkSessionAttachmentIdParam,
  checkFileIdParam,
  transactionWrapper(deleteHandler, `${context} /ssa/:sessionAttachmentId/:fileId?`)
)
router.delete(
  '/o/:objectiveId?/:fileId?',
  checkObjectiveIdParam,
  checkFileIdParam,
  transactionWrapper(deleteHandler, `${context} /o/:objectiveId?/:fileId?`)
)
router.delete(
  '/ot/:objectiveTemplateId?/:fileId?',
  checkObjectiveTemplateIdParam,
  checkFileIdParam,
  transactionWrapper(deleteHandler, `${context} /ot/:objectiveTemplateId?/:fileId?`)
)
router.delete('/report/:reportId?/file/:fileId?', checkReportIdParam, checkFileIdParam, transactionWrapper(deleteActivityReportObjectiveFile))

export default router
