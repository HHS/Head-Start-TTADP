import axios from 'axios';
import httpCodes from 'http-codes';
import httpContext from 'express-http-context';
import isEmail from 'validator/lib/isEmail';
import { v4 as uuidv4 } from 'uuid';

import { logger, auditLogger } from '../logger';
import findOrCreateUser from './findOrCreateUser';
import handleErrors from '../lib/apiErrorHandler';
import { validateUserAuthForAdmin } from './accessValidation';

const namespace = 'MIDDLEWARE:CURRENT USER';

const logContext = {
  namespace,
};

/**
 * Get Current User ID
 *
 * This function will return the CURRENT_USER_ID if BYPASS_AUTH is enabled,
 * req.session.userId if that is set, or res.locals.userId otherwise.
 * If an "Auth-Impersonation-Id" header is set, AND the user (designated by
 * the req.session or req.locals userId) is an admin,
 * then the user ID from the header will be returned.
 */
/**
 *
 * @param {*} req
 * @param {*} res
 * @returns {Promise<number>} the user id to user or impersonate
 */
export async function currentUserId(req, res) {
  function idFromSessionOrLocals() {
    if (req.session && req.session.userId) {
      httpContext.set('impersonationUserId', Number(req.session.userId));
      return Number(req.session.userId);
    }
    if (res.locals && res.locals.userId) {
      httpContext.set('impersonationUserId', Number(res.locals.userId));
      return Number(res.locals.userId);
    }

    // bypass authorization, used for cucumber UAT and axe accessibility testing
    if (process.env.NODE_ENV !== 'production' && process.env.BYPASS_AUTH === 'true') {
      const userId = process.env.CURRENT_USER_ID;
      auditLogger.warn(`Bypassing authentication in authMiddleware - using User ${userId}`);
      if (req.session) {
        req.session.userId = userId;
        req.session.uuid = uuidv4();
      }
      httpContext.set('impersonationUserId', Number(userId));
      return Number(userId);
    }
    return null;
  }

  // There will be an Auth-Impersonation-Id header if the user is impersonating another user.
  // If that is the case, we want to use the impersonated user's ID.
  if (req.headers && req.headers['auth-impersonation-id']) {
    try {
      const impersonatedUserId = JSON.parse(req.headers['auth-impersonation-id']);
      if (impersonatedUserId) {
        // Verify admin access.
        try {
          const userId = idFromSessionOrLocals();

          if (userId === null) {
            auditLogger.error('Impersonation failure. No valid user ID found in session or locals.');
            return res.sendStatus(httpCodes.UNAUTHORIZED);
          }

          if (!(await validateUserAuthForAdmin(Number(userId)))) {
            auditLogger.error(`Impersonation failure. User (${userId}) attempted to impersonate user (${impersonatedUserId}), but the session user (${userId}) is not an admin.`);
            return res.sendStatus(httpCodes.UNAUTHORIZED);
          }

          if (await validateUserAuthForAdmin(Number(impersonatedUserId))) {
            auditLogger.error(`Impersonation failure. User (${userId}) attempted to impersonate user (${impersonatedUserId}), but the impersonated user is an admin.`);
            return res.sendStatus(httpCodes.UNAUTHORIZED);
          }
        } catch (e) {
          return handleErrors(req, res, e, logContext);
        }

        httpContext.set('impersonationUserId', Number(impersonatedUserId));
        return Number(impersonatedUserId);
      }
    } catch (e) {
      auditLogger.error(`Impersonation failure. Could not parse the Auth-Impersonation-Id header: ${e}`);
      return handleErrors(req, res, e, logContext);
    }
  }

  if (
    process.env.NODE_ENV !== 'production'
    && process.env.BYPASS_AUTH === 'true'
    && req.headers && req.headers['playwright-user-id']
  ) {
    const userId = req.headers['playwright-user-id'];
    auditLogger.warn(`Bypassing authentication in authMiddleware. Using user id ${userId} from playwright-user-id header.`);
    if (req.session) {
      req.session.userId = userId;
      req.session.uuid = uuidv4();
    }
    return Number(userId);
  }

  return idFromSessionOrLocals();
}

/**
 * Retrieve User Details
 *
 * This method retrieves the current user details from HSES and finds or creates the TTA Hub user
 */
export async function retrieveUserDetails(accessToken) {
  const requestObj = accessToken.sign({
    method: 'get',
    url: `${process.env.AUTH_BASE}/auth/user/me`,
  });

  const { url } = requestObj;
  const { data } = await axios.get(url, requestObj);

  logger.debug(`User details response data: ${JSON.stringify(data, null, 2)}`);

  let name; let username; let userId; let authorities;
  if (data.principal.attributes) { // PIV card use response
    name = data.name;
    username = data.principal.attributes.user.username;
    userId = data.principal.attributes.user.userId;
    authorities = data.principal.attributes.user.authorities;
  } else {
    name = data.name;
    username = data.principal.username;
    userId = data.principal.userId;
    authorities = data.principal.authorities;
  }

  let email = null;
  if (isEmail(username)) {
    email = username;
  }

  return findOrCreateUser({
    name,
    email,
    hsesUsername: username,
    hsesAuthorities: authorities.map(({ authority }) => authority),
    hsesUserId: userId.toString(),
  });
}
