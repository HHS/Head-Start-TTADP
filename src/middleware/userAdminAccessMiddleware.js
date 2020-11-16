import httpCodes from 'http-codes';
import { validateUserAuthForAdmin } from '../services/accessValidation';
import handleErrors from '../lib/apiErrorHandler';

/**
 * Admin Access Middleware
 *
 * This middleware handles the user admin access by delegating to the
 * admin access validation service. At this point a user is logged in,
 * but might not have the admin priviledges.
 * @param {*} req - request
 * @param {*} res - response
 * @param {*} next - next middleware
 */
export default async function userAdminAccessMiddleware(req, res, next) {
  try {
    if (!(await validateUserAuthForAdmin(req))) {
      // send a 404 rather than a 403 (Forbidden) to avoid confirming route
      return res.sendStatus(httpCodes.NOT_FOUND);
    }
  } catch (e) {
    return handleErrors(req, res, e);
  }

  return next();
}
