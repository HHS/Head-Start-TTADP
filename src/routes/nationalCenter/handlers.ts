import { Request, Response } from 'express';
import { findAll, findAllNationalCenterUsers } from '../../services/nationalCenters';
import handleErrors from '../../lib/apiErrorHandler';

const logContext = 'HANDLERS:NationalCenter';

/* eslint-disable import/prefer-default-export */
export async function getHandler(req: Request, res: Response) {
  try {
    // permissions are already checked by the authMiddleware
    // all we look for is site access
    const centers = await findAll();
    console.log('\n\n\n------centers', centers);
    // Get all users with write training reports permission.
    const users = await findAllNationalCenterUsers();
    console.log('\n\n\n------users', users);
    return res.status(200).json({ centers, users });
  } catch (error) {
    return handleErrors(req, res, error, logContext);
  }
}
