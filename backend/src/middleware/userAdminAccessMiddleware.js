import httpCodes from 'http-codes';
import { currentUserId } from '../services/currentUser';
import { validateUserAuthForAdmin } from '../services/accessValidation';
import { auditLogger } from '../logger';
import handleErrors from '../lib/apiErrorHandler';

/**
 * Admin Access Middleware
 *
 * This middleware handles the user admin access by delegating to the
 * admin access validation service. At this point a user is logged in,
 * but might not have the admin privileges.
 * @param {*} req - request
 * @param {*} res - response
 * @param {*} next - next middleware
 */
export default async function userAdminAccessMiddleware(req, res, next) {
  try {
    const userId = await currentUserId(req, res);
    if (!(await validateUserAuthForAdmin(userId))) {
      auditLogger.error(`User ${userId} attempted to access an ADMIN route without permission`);
      // consider sending a 404 rather than a 403 (Forbidden) to avoid confirming route
      return res.sendStatus(httpCodes.FORBIDDEN);
    }
  } catch (e) {
    return handleErrors(req, res, e);
  }

  return next();
}
