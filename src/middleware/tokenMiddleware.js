import {} from 'dotenv/config';
import { auditLogger } from '../logger';
import { validateUserAuthForAccess } from '../services/accessValidation';
import { currentUserId, retrieveUserDetails } from '../services/currentUser';
import { unauthorized } from '../serializers/errorResponses';
import handleErrors from '../lib/apiErrorHandler';
import { getUserInfo } from './authMiddleware';

const namespace = 'MIDDLEWARE:TOKEN';

const retrieveUserFromHSES = async (req) => {
  const { authorization } = req.headers || {};
  if (!authorization) return null;

  const accessToken = req.session?.accessToken;
  const sub = req.session?.claims?.sub;

  if (!accessToken || !sub) {
    auditLogger.warn(`${namespace} missing session tokens for HSES lookup`);
    return null;
  }

  try {
    const data = await getUserInfo(accessToken, sub);
    const dbUser = await retrieveUserDetails(data);
    return dbUser?.id ?? null;
  } catch (error) {
    auditLogger.error(`Error when retrieving user details from HSES: ${error}`);
    return null;
  }
};

const tokenMiddleware = async (req, res, next) => {
  let userId;
  try {
    userId = (await currentUserId(req, res)) || (await retrieveUserFromHSES(req));
  } catch (err) {
    auditLogger.error(`Error when retrieving user details from HSES: ${err}`);
    next(err);
    return;
  }

  if (!userId) {
    res.status(401).json({
      status: '401',
      title: 'Unauthenticated User',
      detail: 'User token is missing or did not map to a known user',
    });
    return;
  }

  try {
    const hasAccess = await validateUserAuthForAccess(userId);
    if (!hasAccess) {
      auditLogger.warn(`User ${userId} denied access due to missing SITE_ACCESS`);
      unauthorized(res, 'User does not have appropriate permissions to view this resource');
      return;
    }
  } catch (error) {
    await handleErrors(req, res, error, namespace);
    auditLogger.error(`Unrecoverable error in tokenMiddleware: ${error}.`);
    return;
  }

  auditLogger.info(`User ${userId} making API request`);
  res.locals.userId = userId;
  next();
};

export default tokenMiddleware;
