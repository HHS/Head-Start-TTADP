import type { Request, Response } from 'express'
import { findAll } from '../../services/nationalCenters'
import SCOPES from '../../middleware/scopeConstants'
import { findAllUsersWithScope } from '../../services/users'
import handleErrors from '../../lib/apiErrorHandler'

const logContext = 'HANDLERS:NationalCenter'

/* eslint-disable import/prefer-default-export */
export async function getHandler(req: Request, res: Response) {
  try {
    // permissions are already checked by the authMiddleware
    // all we look for is site access
    const centers = await findAll()
    // Get all users with write training reports permission.
    const users = await findAllUsersWithScope(SCOPES.READ_WRITE_TRAINING_REPORTS)
    return res.status(200).json({ centers, users })
  } catch (error) {
    return handleErrors(req, res, error, logContext)
  }
}
