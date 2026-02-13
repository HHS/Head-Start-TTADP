import type { Request, Response } from 'express'
import httpCodes from 'http-codes'
import { DECIMAL_BASE } from '@ttahub/common'
import { getUserReadRegions } from '../services/accessValidation'
import { currentUserId } from '../services/currentUser'
import { recipientById } from '../services/recipient'

const checkRecipientAccessAndExistence = async (req: Request, res: Response) => {
  const { recipientId, regionId } = req.params
  // Check if user has access to this region.
  const userId = await currentUserId(req, res)
  const readRegions = await getUserReadRegions(userId)
  if (!readRegions.includes(parseInt(regionId, DECIMAL_BASE))) {
    res.sendStatus(httpCodes.FORBIDDEN)
    return false
  }

  // Check recipient exists.
  const recipient = await recipientById(recipientId, [])
  if (!recipient) {
    res.sendStatus(httpCodes.NOT_FOUND)
    return false
  }

  return true
}

// eslint-disable-next-line import/prefer-default-export
export { checkRecipientAccessAndExistence }
