import { Request, Response } from 'express';
import { findAll } from '../../services/nationalCenters';
import handleErrors from '../../lib/apiErrorHandler';

const logContext = 'HANDLERS:NationalCenter';

/* eslint-disable import/prefer-default-export */
export function getHandler(req: Request, res: Response) {
  try {
    // permissions are already checked by the authMiddleware
    // all we look for is site access
    const centers = findAll();
    return res.status(200).json(centers);
  } catch (error) {
    return handleErrors(req, res, error, logContext);
  }
}
