import express from 'express'
import httpCodes from 'http-codes'
import multiparty from 'multiparty'
import transactionWrapper from '../transactionWrapper'
import { handleError } from '../../lib/apiErrorHandler'
import { csvImport } from '../../services/course'
import { bufferFromPath } from './helpers'

const namespace = 'ADMIN:COURSE'
const logContext = { namespace }

export async function importCourse(req, res) {
  try {
    const form = new multiparty.Form()

    form.parse(req, async (err, fields, files) => {
      if (err) {
        await handleError(req, res, err, logContext)
        return
      }

      // allow text/csv only
      if (files.file[0].headers['content-type'] !== 'text/csv') {
        res.status(httpCodes.BAD_REQUEST).json({ error: 'Invalid file type' })
        return
      }

      const file = files.file[0]
      const buf = bufferFromPath(file.path)
      const response = await csvImport(buf)

      res.status(httpCodes.OK).json(response)
    })
  } catch (err) {
    await handleError(req, res, err, logContext)
  }
}

const router = express.Router()

router.post('/', transactionWrapper(importCourse))

export default router
