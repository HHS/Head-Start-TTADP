import {} from 'dotenv/config';
import { auditLogger } from '../logger';
import { validateUserAuthForAccess } from '../services/accessValidation';
import { hsesAuth } from './authMiddleware';
import { currentUserId, retrieveUserDetails } from '../services/currentUser';
import { unauthorized } from '../serializers/errorResponses';
import handleErrors from '../lib/apiErrorHandler';

const namespace = 'MIDDLEWARE:TOKEN';

const retrieveUserFromHSES = async (req) => {
  const { authorization } = req.headers;

  if (authorization) {
    const [, bearerToken] = authorization.split(' ');
    const accessToken = hsesAuth.createToken(bearerToken);
    try {
      const dbUser = await retrieveUserDetails(accessToken);
      return dbUser.id;
    } catch (error) {
      auditLogger.error(`Error when retrieving user details from HSES: ${error}`);
    }
  }
  return null;
};

const tokenMiddleware = async (req, res, next) => {
  const userId = await currentUserId(req, res) || await retrieveUserFromHSES(req);

  if (!userId) {
    return res.status(401).json({
      status: '401',
      title: 'Unauthenticated User',
      detail: 'User token is missing or did not map to a known user',
    });
  }

  try {
    const hasAccess = await validateUserAuthForAccess(userId);
    if (!hasAccess) {
      auditLogger.warn(`User ${userId} denied access due to missing SITE_ACCESS`);
      return unauthorized(res, 'User does not have appropriate permissions to view this resource');
    }
    auditLogger.info(`User ${userId} making API request`);
    res.locals.userId = userId;
  } catch (error) {
    // handleErrors returns a promise, and sends a 500 status to the client
    return await handleErrors(req, res, error, namespace);
  }
  return next();
};

export default tokenMiddleware;
