/* eslint-disable import/prefer-default-export */
import express, { type Response, type Request } from 'express'
import httpCodes from 'http-codes'
import { DECIMAL_BASE } from '@ttahub/common'
import transactionWrapper from '../transactionWrapper'
import { handleError } from '../../lib/apiErrorHandler'
import { updateById, deleteById, create } from '../../services/nationalCenters'

const namespace = 'ADMIN:NATIONAL-CENTER'
const logContext = { namespace }

const router = express.Router()

export async function updateNationalCenter(req: Request, res: Response) {
  try {
    const { nationalCenterId } = req.params
    const { name, userId } = req.body
    const center = await updateById(parseInt(nationalCenterId, DECIMAL_BASE), { name, userId })
    return res.status(httpCodes.OK).json(center)
  } catch (err) {
    return handleError(req, res, err, logContext)
  }
}

export async function deleteNationalCenter(req: Request, res: Response) {
  try {
    const { nationalCenterId } = req.params
    await deleteById(parseInt(nationalCenterId, DECIMAL_BASE))
    return res.status(httpCodes.OK).json({ message: 'National Center deleted successfully' })
  } catch (err) {
    return handleError(req, res, err, logContext)
  }
}

export async function createNationalCenter(req: Request, res: Response) {
  try {
    const { name, userId } = req.body
    const center = await create({ name }, userId)
    return res.status(httpCodes.CREATED).json(center)
  } catch (err) {
    return handleError(req, res, err, logContext)
  }
}

router.post('/', transactionWrapper(createNationalCenter))
router.put('/:nationalCenterId', transactionWrapper(updateNationalCenter))
router.delete('/:nationalCenterId', transactionWrapper(deleteNationalCenter))

export default router
